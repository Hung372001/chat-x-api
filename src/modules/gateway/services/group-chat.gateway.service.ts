import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, FindOptionsWhere, In, Repository } from 'typeorm';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { Server, Socket } from 'socket.io';
import { User } from '../../user/entities/user.entity';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { AppGateway } from '../app.gateway';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { GatewaySessionManager } from '../sessions/gateway.session';
import { UserGatewayService } from './user.gateway.service';
import { intersectionBy } from 'lodash';

@Injectable()
export class GroupChatGatewayService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @Inject(UserGatewayService) private userService: UserGatewayService,
    @Inject(GatewaySessionManager)
    private readonly insideGroupSessions: GatewaySessionManager<string>,
    @InjectConnection() private readonly connection: Connection,
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['admins'],
    });
  }

  async findOneWithMemberIds(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ) {
    try {
      const groupChat = await this.groupChatRepo.findOne({
        where: query,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      groupChat.members = await this.connection.query(
        `
        SELECT "userId" as "id"
        FROM "group_chat_members_user"
        LEFT JOIN "user" ON "group_chat_members_user"."userId" = "user"."id"
        WHERE "groupChatId" = '${groupChat.id}' and "user"."deleted_at" IS NULL;
      `,
      );

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updatedAt(id: string) {
    return this.groupChatRepo.update(id, {});
  }

  async findOneWithSettings(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members', 'admins', 'settings', 'settings.user'],
    });
  }

  async findSetting(
    userId: string,
    groupId: string,
  ): Promise<GroupChatSetting | null> {
    return this.groupSettingRepo
      .createQueryBuilder('group_chat_setting')
      .leftJoinAndSelect('group_chat_setting.user', 'user')
      .where('group_chat_setting.userId = :userId', { userId })
      .andWhere('group_chat_setting.groupChatId = :groupId', { groupId })
      .getOne();
  }

  async getGroupChatDou(memberIds: string[], gateway: AppGateway) {
    try {
      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .select('group_chat.id')
        .leftJoin('group_chat.members', 'user')
        .where('group_chat.type = :type', { type: EGroupChatType.DOU })
        .addGroupBy('group_chat.id')
        .having(`array_agg(user.id) @> :userIds::uuid[]`, {
          userIds: memberIds,
        })
        .getOne();

      if (!groupChat) {
        const members = await this.userService.findMany({
          where: { id: In(memberIds) },
          relations: ['profile'],
        });
        if (members?.length === 2) {
          const newGroupChat = {
            members: members,
            type: EGroupChatType.DOU,
          } as unknown as GroupChat;

          await this.groupChatRepo.save(newGroupChat);

          // Call socket to create group chat
          await gateway.createGroupChat(newGroupChat);

          // Create member setting
          const memberSettings = [];
          await Promise.all(
            members.map((member) => {
              memberSettings.push({
                groupChat: newGroupChat,
                user: member,
              });
            }),
          );

          await this.groupSettingRepo.save(memberSettings);
          newGroupChat.settings = memberSettings;

          return newGroupChat;
        } else {
          throw {
            message:
              'Không thể nhắn tin với tài khoản đã bị xóa hoặc không tồn tại.',
          };
        }
      } else {
        const foundGroupChat = await this.findOneWithSettings({
          id: groupChat.id,
        });
        if (foundGroupChat.members.some((x) => !x.isActive)) {
          throw {
            message:
              'Không thể nhắn tin với tài khoản đã bị xóa hoặc không tồn tại.',
          };
        }
        return foundGroupChat;
      }
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getJoinedGroups(userId: string) {
    try {
      return this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.members', 'user')
        .where('user.id = :userId', { userId })
        .getMany();
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async emitOnlineGroupMember(
    server: Server,
    client: Socket,
    member: User,
    joinGroup = true,
  ) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Join socket to all group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (joinGroup) {
            await client.join(group.id);
          }
          const insideMembers = this.insideGroupSessions.getUserSession(
            group.id,
          );
          if (insideMembers?.length) {
            client.to(group.id).emit('someoneOnline', {
              groupChat: group,
              member,
            });
          }
        }),
      );
    }
  }

  async emitOfflineGroupMember(
    server: Server,
    client: Socket,
    member: User,
    leaveGroup = true,
  ) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Leave all joined group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (leaveGroup) {
            await client.leave(group.id);
          }
          const insideMembers = this.insideGroupSessions.getUserSession(
            group.id,
          );
          if (insideMembers?.length) {
            client.to(group.id).emit('someoneOffline', {
              groupChat: group,
              member,
            });
          }
        }),
      );
    }
  }

  async addMemberForPublicGroup(groupChat: GroupChat, member: User) {
    // push new member into group members
    groupChat.members.push(member);
    await this.groupChatRepo.save(groupChat);

    // create group chat setting for new member
    await this.groupSettingRepo.save({
      groupChat,
      user: member,
    });

    return groupChat;
  }

  async readMessages(groupId: string, user: User) {
    try {
      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoin('group_chat.members', 'user as members')
        .leftJoinAndSelect('group_chat.settings', 'group_chat_setting')
        .where('group_chat.id = :groupId', { groupId })
        .andWhere('user as members.id = :userId', { userId: user.id })
        .andWhere('group_chat_setting.userId = :settingUserId', {
          settingUserId: user.id,
        })
        .getOne();

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const messages = await this.chatMessageRepo
        .createQueryBuilder('chat_message')
        .where('chat_message.groupId = :groupId', { groupId })
        .getMany();

      if (messages.length) {
        await this.chatMessageRepo.update(
          messages.map((x) => x.id),
          {
            isRead: true,
          },
        );

        if (groupChat.settings.length) {
          groupChat.settings[0].unReadMessages = 0;
          await this.groupSettingRepo.update(groupChat.settings[0].id, {
            unReadMessages: groupChat.settings[0].unReadMessages,
          });
        }
      }

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async isGroupAdmin(groupId: string, userId: string) {
    const isAdmin = await this.connection.query(`
      SELECT COUNT("userId")
      FROM "group_chat_admins_user"
      WHERE "groupChatId" = '${groupId}' and "userId" = '${userId}'
    `);

    return isAdmin.length ? isAdmin[0]?.count === '1' : false;
  }

  async isGroupMember(groupId: string, userId: string) {
    const isMember = await this.connection.query(`
      SELECT COUNT("userId")
      FROM "group_chat_members_user"
      WHERE "groupChatId" = '${groupId}' and "userId" = '${userId}'
    `);

    return isMember.length ? isMember[0]?.count === '1' : false;
  }
}

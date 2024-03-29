import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, FindOptionsWhere, In, Repository } from 'typeorm';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { Server, Socket } from 'socket.io';
import { User } from '../../user/entities/user.entity';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { AppGateway } from '../app.gateway';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { GatewaySessionManager } from '../sessions/gateway.session';
import { UserGatewayService } from './user.gateway.service';
import { CacheService } from '../../cache/cache.service';
import { ClientProxy } from '@nestjs/microservices';
import { ERmqQueueName } from '../../../common/enums/rmq.enum';

@Injectable()
export class GroupChatGatewayService extends BaseService<GroupChat> {
  private logger = new Logger(GroupChatGatewayService.name);
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserGatewayService) private userService: UserGatewayService,
    @Inject(GatewaySessionManager)
    private readonly insideGroupSessions: GatewaySessionManager<string>,
    @Inject(CacheService) private cacheService: CacheService,
    @Inject(ERmqQueueName.CHAT_GATEWAY) private rmqClient: ClientProxy,
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

  async findOneWithMemberIds(groupId: string) {
    try {
      const cacheKey = `GroupChat_${groupId}`;
      let groupChat = await this.cacheService.get(cacheKey);

      if (!groupChat) {
        groupChat = await this.groupChatRepo.findOne({
          where: { id: groupId },
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

        await this.cacheService.set(cacheKey, groupChat);
      }

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
    const cacheKey = `GroupSetting_${userId}_${groupId})}`;
    let setting = await this.cacheService.get(cacheKey);

    if (!setting) {
      setting = await this.groupSettingRepo
        .createQueryBuilder('group_chat_setting')
        .leftJoinAndSelect('group_chat_setting.user', 'user')
        .where('group_chat_setting.userId = :userId', { userId })
        .andWhere('group_chat_setting.groupChatId = :groupId', { groupId })
        .getOne();
    }

    return setting;
  }

  async getGroupChatDou(memberIds: string[], gateway: AppGateway) {
    try {
      const cacheKey = `GroupDou_${JSON.stringify(memberIds.sort())}`;
      let groupChat = await this.cacheService.get(cacheKey);

      if (!groupChat) {
        groupChat = await this.groupChatRepo
          .createQueryBuilder('group_chat')
          .select('group_chat.id')
          .leftJoin('group_chat.members', 'user')
          .where('group_chat.type = :type', { type: EGroupChatType.DOU })
          .addGroupBy('group_chat.id')
          .having(`array_agg(user.id) @> :userIds::uuid[]`, {
            userIds: memberIds,
          })
          .getOne();

        await this.cacheService.set(cacheKey, groupChat);
      }

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
          // newGroupChat.settings = memberSettings;

          return newGroupChat;
        } else {
          throw {
            message:
              'Không thể nhắn tin với tài khoản đã bị xóa hoặc không tồn tại.',
          };
        }
      } else {
        const cacheKey = `GroupChat_${JSON.stringify(groupChat.id)}`;
        let foundGroupChat = await this.cacheService.get(cacheKey);

        if (!foundGroupChat) {
          foundGroupChat = await this.findOneWithSettings({
            id: groupChat.id,
          });

          if (foundGroupChat.members.some((x) => !x.isActive)) {
            throw {
              message:
                'Không thể nhắn tin với tài khoản đã bị xóa hoặc không tồn tại.',
            };
          }

          await this.cacheService.set(cacheKey, foundGroupChat);
        }

        return foundGroupChat;
      }
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getJoinedGroups(userId: string) {
    let groupChatIds;
    const cacheKey = `GroupChatIds_${userId}`;
    try {
      try {
        groupChatIds = await this.cacheService.get(cacheKey);
      } catch (e: any) {
        this.logger.error(e.message);
      }

      if (!groupChatIds?.length) {
        let groupChatIds = await this.connection.query(`
        select distinct "groupChatId"
        from "group_chat_members_user"
        where "userId" = '${userId}'
        `);
        if (groupChatIds?.length) {
          groupChatIds = groupChatIds.map((x) => x.groupChatId);
          this.cacheService.set(cacheKey, groupChatIds);
        }
      }

      return groupChatIds;
    } catch (e: any) {
      this.logger.error(e.message);
    }

    return null;
  }

  async emitOnlineGroupMember(
    server: Server,
    client: Socket,
    member: User,
    joinGroup = true,
  ) {
    const groupChatIds = await this.getJoinedGroups(member.id);

    // Join socket to all group
    if (groupChatIds?.length) {
      Promise.all(
        groupChatIds.map(async (groupId) => {
          if (joinGroup) {
            await client.join(groupId);
          }
          const insideMembers =
            this.insideGroupSessions.getUserSession(groupId);
          if (insideMembers?.length) {
            client.to(groupId).emit('someoneOnline', {
              groupChat: { id: groupId },
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
    const groupChatIds = await this.getJoinedGroups(member.id);

    // Leave all joined group
    if (groupChatIds?.length > 0) {
      Promise.all(
        groupChatIds.map(async (groupId) => {
          if (leaveGroup) {
            await client.leave(groupId);
          }
          const insideMembers =
            this.insideGroupSessions.getUserSession(groupId);
          if (insideMembers?.length) {
            client.to(groupId).emit('someoneOffline', {
              groupChat: { id: groupId },
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
      const cacheKey = `ReadMessagesss_${groupId}_${user.id}`;
      const requestReadMessages = await this.cacheService.get(cacheKey);
      let unReadMessages = 0;

      if (!requestReadMessages) {
        await this.cacheService.set(cacheKey, true);

        const fullTimeoutMsgCK = `Fullmessage_${groupId}`;
        const fullTimeoutMsg = await this.cacheService.get(fullTimeoutMsgCK);
        if (fullTimeoutMsg?.length && fullTimeoutMsg?.some((x) => !x.isRead)) {
          await fullTimeoutMsg.forEach((el) => (el.isRead = true));
          this.cacheService.set(fullTimeoutMsgCK, fullTimeoutMsg);

          unReadMessages = fullTimeoutMsg.count;
        }

        // Publish queue message
        await this.rmqClient.emit('readMessages', {
          groupId,
          user,
        });
      }

      return {
        groupChat: {
          id: groupId,
        },
        unReadMessages,
      };
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

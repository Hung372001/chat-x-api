import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { Socket } from 'socket.io';
import { User } from '../../user/entities/user.entity';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { AppGateway } from '../app.gateway';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { ReadMessageDto } from '../../chat-message/dto/read-message.dto';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { GatewaySessionManager } from '../sessions/gateway.session';
import { UserGatewayService } from './user.gateway.service';

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
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members', 'admins'],
    });
  }

  async findOneWithSettings(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members', 'admins', 'settings', 'settings.user'],
    });
  }

  async getGroupChatDou(memberIds: string[], gateway: AppGateway) {
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
      }

      return null;
    } else {
      return this.findOneWithSettings({ id: groupChat.id });
    }
  }

  async getJoinedGroups(userId: string) {
    try {
      return this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.members', 'user', 'user.id = :userId', {
          userId,
        })
        .getMany();
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async emitOnlineGroupMember(client: Socket, member: User, joinGroup = true) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Join socket to all group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (joinGroup) {
            await client.join(group.id);
          }
          client.broadcast.to(group.id).emit('someoneOnline', {
            groupChat: group,
            member,
          });
        }),
      );
    }
  }

  async emitOfflineGroupMember(
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
          client.broadcast.to(group.id).emit('someoneOffline', {
            groupChat: group,
            member,
          });
        }),
      );
    }
  }

  async readMessages(dto: ReadMessageDto, user: User) {
    try {
      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoin('group_chat.members', 'user as members')
        .leftJoinAndSelect('group_chat.settings', 'group_chat_setting')
        .where('group_chat.id = :groupId', { groupId: dto.groupId })
        .andWhere('user.id = :userId', { userId: user.id })
        .andWhere('group_chat_setting.userId = :userId', { userId: user.id })
        .getOne();

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      let messages = await this.chatMessageRepo
        .createQueryBuilder('chat_message')
        .leftJoinAndSelect('chat_message.readsBy', 'user')
        .where('chat_message.groupId = :groupId', { groupId: dto.groupId })
        .andWhere('user.id = :userId', { userId: user.id })
        .andWhere('chat_message.id In (:...messageIds)', {
          messageIds: dto.messageIds,
        })
        .getMany();

      messages = messages.filter(
        (x) => !x.readsBy.some((x) => x.id === user.id),
      );

      if (messages.length) {
        Promise.all(
          messages.map(async (message) => {
            message.readsBy.push(user);
            await this.chatMessageRepo.update(message.id, {
              isRead: true,
              readsBy: message.readsBy,
            });
          }),
        );

        if (groupChat.settings.length) {
          groupChat.settings[0].unReadMessages -= messages.length;
          await this.groupSettingRepo.update(groupChat.settings[0].id, {
            unReadMessages: groupChat.settings[0].unReadMessages,
          });
        }
      }

      return {
        groupChat,
        unReadMessages: groupChat.settings[0].unReadMessages,
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

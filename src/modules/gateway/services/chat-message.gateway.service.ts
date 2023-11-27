import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { GroupChatGatewayService } from './group-chat.gateway.service';
import { SendMessageDto } from '../../chat-message/dto/send-message.dto';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { GatewaySessionManager } from '../sessions/gateway.session';
import { intersectionBy } from 'lodash';
import moment from 'moment';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { UserGatewayService } from './user.gateway.service';
import { ClientProxy } from '@nestjs/microservices';
import { CacheService } from '../../cache/cache.service';
import { TelegramLoggerService } from '../../logger/telegram.logger-service';

@Injectable()
export class ChatMessageGatewayService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserGatewayService)
    private userService: UserGatewayService,
    @Inject(GatewaySessionManager)
    private readonly insideGroupSessions: GatewaySessionManager<string>,
    @Inject('CHAT-MESSAGE_SERVICE') private rmqClient: ClientProxy,
    @Inject(CacheService) private cacheService: CacheService,
    @Inject(TelegramLoggerService)
    private telegramLogger: TelegramLoggerService,
  ) {}

  async sendMessage(dto: SendMessageDto, sender: User, groupChat?: GroupChat) {
    try {
      if (!groupChat) {
        groupChat = await this.groupChatService.findOneWithMemberIds(
          dto.groupId,
        );
      }

      if (
        groupChat.type === EGroupChatType.DOU &&
        groupChat?.members?.length !== 2
      ) {
        throw {
          message:
            'Không thể nhắn tin với tài khoản đã bị xóa hoặc không tồn tại.',
        };
      }

      if (
        !groupChat.isPublic &&
        !groupChat.members.some((x) => x.id === sender.id)
      ) {
        throw {
          message: 'Phải là thành viên nhóm chat mới được gửi tin nhắn.',
        };
      }

      let nameCard = null;
      if (dto.nameCardUserId) {
        nameCard = await this.userService.findOne({ id: dto.nameCardUserId });

        if (!nameCard) {
          throw {
            message: 'Không tìm thấy danh thiếp.',
          };
        }
      }

      let isNewMember = false;
      if (
        groupChat.isPublic &&
        !groupChat.members.some((x) => x.id === sender.id)
      ) {
        groupChat = await this.groupChatService.addMemberForPublicGroup(
          groupChat,
          sender,
        );
        isNewMember = true;
      }

      const groupSession = this.insideGroupSessions.getUserSession(
        groupChat.id,
      );

      let insideGroupMembers = [sender];
      if (groupSession?.length) {
        insideGroupMembers = intersectionBy(
          groupChat.members,
          groupSession.map((x) => ({ id: x })),
          'id',
        );
      }

      const newMessage = await this.chatMessageRepo.create({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender,
        group: groupChat,
        nameCard,
        isFriendRequest: dto.isFriendRequest,
      } as ChatMessage);
      await this.chatMessageRepo.save(newMessage);

      // Save latest message for group
      groupChat.latestMessage = newMessage;
      await this.groupChatService.update(groupChat.id, {
        latestMessage: groupChat.latestMessage,
      });

      // Publish queue message
      this.rmqClient.emit('saveMsgAndSendNoti', {
        newMessage,
        sender,
        insideGroupMembers,
        groupChat,
      });

      return { ...newMessage, isNewMember };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async togglePinMessage(id: string, user: User, pinMessage: boolean) {
    try {
      const message = await this.chatMessageRepo.findOne({
        where: { id },
        relations: [
          'group',
          'group.admins',
          'sender',
          'sender.profile',
          'nameCard',
          'nameCard.profile',
        ],
      });

      if (!message) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (message.pinned && pinMessage) {
        throw { message: 'Tin nhắn đã được ghim.' };
      }

      if (!message.pinned && !pinMessage) {
        throw { message: 'Tin nhắn đã được bỏ ghim.' };
      }

      if (message.group.type === EGroupChatType.GROUP) {
        if (!message.group.admins.some((x) => x.id === user.id)) {
          throw {
            message: `Quản trị viên mới có quyền ${
              pinMessage ? 'ghim' : 'bỏ ghim'
            } tin nhắn`,
          };
        }
      }

      message.pinned = pinMessage;
      await this.chatMessageRepo.update(id, { pinned: pinMessage });

      const cacheKey = `PinnedMessage_${message.group.id}`;
      await this.cacheService.del(cacheKey);

      return message;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async unsendMessage(chatMessageId: string, unsender: User) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: [
          'sender',
          'sender.profile',
          'group',
          'group.admins',
          'group.settings',
          'group.settings.user',
        ],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (chatMessage.unsent) {
        throw { message: 'Tin nhắn đã được thu hồi.' };
      }

      if (chatMessage.pinned) {
        throw { message: 'Bỏ ghim để thu hồi tin nhắn.' };
      }

      if (
        !chatMessage.group.admins.some((x) => x.id === unsender.id) &&
        unsender.id !== chatMessage.sender.id
      ) {
        throw {
          message:
            'Chỉ có quản trị viên và người gửi mới có quyền thu hồi tin nhắn.',
        };
      }

      chatMessage.unsent = true;
      chatMessage.unsentBy = unsender;
      this.chatMessageRepo.save(chatMessage);

      const unReadSettings = chatMessage.group.settings.filter(
        (x) => x.unReadMessages > 0 && x.user.id !== chatMessage.sender.id,
      );
      if (unReadSettings.length) {
        Promise.all(
          unReadSettings.map(async (setting) => {
            await this.groupSettingRepo.update(setting.id, {
              unReadMessages:
                setting.unReadMessages > 1 ? setting.unReadMessages - 1 : 0,
            });
          }),
        );
      }

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(chatMessageId: string, deletedBy: User) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'sender.profile', 'group', 'group.latestMessage'],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (chatMessage.pinned) {
        throw { message: 'Bỏ ghim để xóa tin nhắn.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        chatMessage.group.id,
        deletedBy.id,
      );

      if (!isAdmin && chatMessage.sender.id !== deletedBy.id) {
        throw {
          message: 'Bạn không có quyền xóa tin nhắn.',
        };
      }

      chatMessage.deletedAt = moment.utc().toDate();
      await this.chatMessageRepo.update(chatMessage.id, { deletedBy });
      await this.chatMessageRepo.softDelete(chatMessage.id);

      if (
        chatMessage?.group?.id &&
        chatMessage?.group?.latestMessage?.id === chatMessage?.id
      ) {
        const latestMessage = await this.chatMessageRepo
          .createQueryBuilder('chat_message')
          .where('chat_message.groupId = :groupId', {
            groupId: chatMessage.group.id,
          })
          .orderBy('chat_message.createdAt', 'DESC')
          .getOne();

        if (latestMessage) {
          await this.groupChatService.update(chatMessage.group.id, {
            latestMessage,
          });
        }
      }

      // await this.rmqClient.emit('updateUnReadSettings', { chatMessageId });

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

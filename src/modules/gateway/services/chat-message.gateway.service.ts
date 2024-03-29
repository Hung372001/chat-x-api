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
import { v4 as uuidv4 } from 'uuid';
import { OnlinesSessionManager } from '../sessions/onlines.session';
import { ERmqQueueName } from '../../../common/enums/rmq.enum';

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
    @Inject(ERmqQueueName.CHAT_GATEWAY) private rmqClient: ClientProxy,
    @Inject(ERmqQueueName.NOTIFICATION) private notiRmqClient: ClientProxy,
    @Inject(CacheService) private cacheService: CacheService,
    @Inject(OnlinesSessionManager)
    private readonly onlineSessions: OnlinesSessionManager,
    @Inject(TelegramLoggerService) private teleLogger: TelegramLoggerService,
  ) {}

  async sendMessage(dto: SendMessageDto, sender: User, groupChat?: GroupChat) {
    try {
      if (
        !dto.message &&
        !dto.imageUrls?.length &&
        !dto.documentUrls?.length &&
        !dto.nameCardUserId
      ) {
        return null;
      }

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
        insideGroupMembers = await intersectionBy(
          groupChat.members,
          groupSession.map((x) => ({ id: x })),
          'id',
        );
      }

      const now = moment.utc().toDate();
      const newMessage = {
        id: uuidv4(),
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender: {
          id: sender.id,
        },
        group: { id: groupChat.id },
        nameCard: nameCard ? { id: nameCard.id } : null,
        isFriendRequest: dto.isFriendRequest,
        createdAt: now,
        updatedAt: now,
        isRead: !!(insideGroupMembers?.length > 1),
      } as ChatMessage;

      // Publish queue message
      await this.rmqClient.emit('saveMsg', {
        newMessage,
        sender,
        groupChat,
        nameCard,
      });

      await this.notiRmqClient.emit('sendMsgNoti', {
        newMessage,
        sender,
        insideGroupMembers,
        groupChat,
        onlineUsers: Object.fromEntries(this.onlineSessions.getSession()),
      });

      newMessage.sender = sender;
      newMessage.group = groupChat;
      newMessage.nameCard = nameCard;

      if (
        !newMessage.message &&
        !newMessage.imageUrls &&
        !newMessage.documentUrls &&
        !newMessage.nameCard
      ) {
        this.teleLogger.error({
          error: 'Null content',
          input: dto,
          output: newMessage,
        });
      }

      return { ...newMessage, isNewMember };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async togglePinMessage(id: string, user: User, pinMessage: boolean) {
    try {
      let message = null;
      let fromCache = true;
      let fullTimeoutMsgCK = null;
      let fullTimeoutMsg = null;

      const allMsg = await this.cacheService.get(`AllMessage`);
      if (allMsg?.length) {
        const msg = allMsg.find((x) => x.chatMessageId === id);
        if (msg) {
          fullTimeoutMsgCK = `Fullmessage_${msg.groupChatId}`;
          fullTimeoutMsg = await this.cacheService.get(fullTimeoutMsgCK);

          if (fullTimeoutMsg) {
            message = fullTimeoutMsg.find((x) => x.id === id);
          }
        }
      }

      if (!message) {
        message = await this.chatMessageRepo.findOne({
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
        fromCache = false;
      }

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
      if (fromCache) {
        this.cacheService.set(fullTimeoutMsgCK, fullTimeoutMsg);
      } else {
        await this.chatMessageRepo.update(id, { pinned: pinMessage });
      }

      const cacheKey = `PinnedMessage_${message.group.id}`;
      await this.cacheService.del(cacheKey);

      return message;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async unsendMessage(chatMessageId: string, unsender: User) {
    try {
      let chatMessage = null;
      let fromCache = true;
      let fullTimeoutMsgCK = null;
      let fullTimeoutMsg = null;
      const allMsg = await this.cacheService.get(`AllMessage`);
      if (allMsg?.length) {
        const msg = allMsg.find((x) => x.chatMessageId === chatMessageId);
        if (msg) {
          fullTimeoutMsgCK = `Fullmessage_${msg.groupChatId}`;
          fullTimeoutMsg = await this.cacheService.get(fullTimeoutMsgCK);

          if (fullTimeoutMsg) {
            chatMessage = fullTimeoutMsg.find((x) => x.id === chatMessageId);
          }
        }
      }

      if (!chatMessage) {
        chatMessage = await this.chatMessageRepo.findOne({
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
        fromCache = false;
      }

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
      if (fromCache) {
        this.cacheService.set(fullTimeoutMsgCK, fullTimeoutMsg);
      } else {
        this.chatMessageRepo.save(chatMessage);
      }

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
      let chatMessage = null;
      let fromCache = true;
      let fullTimeoutMsgCK = null;
      let fullTimeoutMsg = null;
      const allMsg = await this.cacheService.get(`AllMessage`);
      if (allMsg?.length) {
        const msg = allMsg.find((x) => x.chatMessageId === chatMessageId);
        if (msg) {
          fullTimeoutMsgCK = `Fullmessage_${msg.groupChatId}`;
          fullTimeoutMsg = await this.cacheService.get(fullTimeoutMsgCK);

          if (fullTimeoutMsg) {
            chatMessage = fullTimeoutMsg.find((x) => x.id === chatMessageId);
          }
        }
      }

      if (!chatMessage) {
        chatMessage = await this.chatMessageRepo.findOne({
          where: {
            id: chatMessageId,
          },
          relations: [
            'sender',
            'sender.profile',
            'group',
            'group.latestMessage',
          ],
        });
        fromCache = false;
      }

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
      if (fromCache) {
        this.cacheService.set(fullTimeoutMsgCK, fullTimeoutMsg);
      } else {
        await this.chatMessageRepo.softDelete(chatMessage.id);
      }

      if (chatMessage?.group?.id) {
        const cacheKey = `LatestMsg_${chatMessage.group.id}`;
        chatMessage.group.latestMessage = await this.cacheService.get(cacheKey);

        if (chatMessage?.group?.latestMessage?.id === chatMessage?.id) {
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

            await this.cacheService.set(cacheKey, latestMessage);
          }
        }
      }

      // await this.rmqClient.emit('updateUnReadSettings', { chatMessageId });

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

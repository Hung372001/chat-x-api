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
import { NotificationService } from '../../notification/notification.service';
import { ENotificationType } from '../../notification/dto/enum-notification';
import { OnlinesSessionManager } from '../sessions/onlines.session';
import moment from 'moment';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { UserGatewayService } from './user.gateway.service';
import { Friendship } from '../../friend/entities/friendship.entity';

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
    @Inject(OnlinesSessionManager)
    private readonly onlineSessions: OnlinesSessionManager,
    @Inject(NotificationService)
    private readonly notifyService: NotificationService,
  ) {}

  async sendMessage(dto: SendMessageDto, sender: User, groupChat?: GroupChat) {
    try {
      if (!groupChat) {
        groupChat = await this.groupChatService.findOneWithSettings({
          id: dto.groupId,
        });
      }

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (
        !groupChat.enabledChat &&
        !groupChat.admins.some((x) => x.id === sender.id)
      ) {
        throw { message: 'Tính năng chat đang bị khóa.' };
      }

      if (
        !groupChat.members.some((x) => x.id === sender.id) &&
        !groupChat.admins.some((x) => x.id === sender.id)
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

      const newMessage = await this.chatMessageRepo.save({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender,
        group: groupChat,
        nameCard,
        readsBy: insideGroupMembers,
        isFriendRequest: dto.isFriendRequest,
      } as ChatMessage);

      if (groupChat?.settings?.length) {
        Promise.all(
          groupChat.settings.map(async (setting) => {
            if (!insideGroupMembers.some((x) => x.id === setting.user.id)) {
              if (
                !this.onlineSessions.getUserSession(setting.user.id) &&
                !setting.muteNotification
              ) {
                // get friendship
                const friendship = await this.userService.findFriendship(
                  sender.id,
                  setting.user.id,
                );

                // send notification
                this.sendMessageNotification(
                  groupChat,
                  sender,
                  setting.user,
                  friendship,
                  newMessage,
                );
              }

              await this.groupSettingRepo.update(setting.id, {
                unReadMessages: setting.unReadMessages + 1,
              });
            }
          }),
        );
      }

      // Save latest message for group
      groupChat.latestMessage = newMessage;
      await this.groupChatService.update(groupChat.id, {
        latestMessage: groupChat.latestMessage,
      });

      if (newMessage.group.latestMessage) {
        delete newMessage.group.latestMessage;
      }

      if (newMessage.group.settings?.length) {
        newMessage.group.settings.forEach((x) => delete x.groupChat);
      }

      return newMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  sendMessageNotification(
    group: GroupChat,
    sender: User,
    receiver: User,
    friendship: Friendship,
    chatMessage: ChatMessage,
  ) {
    let title = group.name;

    let messageContent = chatMessage.message;
    if (!chatMessage.message) {
      if (chatMessage.nameCard) {
        messageContent = `Danh thiếp ${chatMessage.nameCard.username}`;
      } else {
        messageContent = 'Photos';
        if (!chatMessage.imageUrls) {
          if (!chatMessage.documentUrls) {
            messageContent = 'Attach files';
          }
        }
      }
    }

    let content = `${
      friendship && friendship.nickname ? friendship.nickname : sender.username
    }: ${messageContent}`;

    if (group.type === EGroupChatType.DOU) {
      title = receiver.username;
      content = `${messageContent}`;
    }

    this.notifyService.send({
      title,
      content,
      userId: receiver.id,
      imageUrl: sender.profile.avatar,
      notificationType: ENotificationType.UNREAD_MESSAGE,
      data: { groupId: group.id },
    });
  }

  async togglePinMessage(id: string, user: User, pinMessage: boolean) {
    try {
      const message = await this.chatMessageRepo.findOne({
        where: { id },
        relations: ['group', 'group.admins', 'sender', 'sender.profile'],
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
        relations: ['sender', 'sender.profile', 'group', 'group.admins'],
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
        relations: ['sender', 'sender.profile', 'group', 'group.members'],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (chatMessage.pinned) {
        throw { message: 'Bỏ ghim để xóa tin nhắn.' };
      }

      if (!chatMessage.group.members.some((x) => x.id === deletedBy.id)) {
        throw {
          message: 'Bạn không phải là thành viên nhóm chat.',
        };
      }

      chatMessage.deletedAt = moment.utc().toDate();
      await this.chatMessageRepo.update(chatMessage.id, { deletedBy });
      await this.chatMessageRepo.softDelete(chatMessage.id);

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '../../rmq/rmq.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { Repository } from 'typeorm';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { Friendship } from '../../friend/entities/friendship.entity';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { ENotificationType } from '../../notification/dto/enum-notification';
import { User } from '../../user/entities/user.entity';
import { GroupChatGatewayService } from '../services/group-chat.gateway.service';
import { OnlinesSessionManager } from '../sessions/onlines.session';
import { NotificationService } from '../../notification/notification.service';
import { UserGatewayService } from '../services/user.gateway.service';

@Controller()
export class ChatMessageConsumer {
  private readonly logger = new Logger(ChatMessageConsumer.name);

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
    @Inject(OnlinesSessionManager)
    private readonly onlineSessions: OnlinesSessionManager,
    @Inject(NotificationService)
    private readonly notifyService: NotificationService,
    private rmqService: RmqService,
    @Inject(UserGatewayService)
    private userService: UserGatewayService,
  ) {}

  @EventPattern('updateUnReadSettings')
  async sendChatMessage(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.debug('Start job update unRead settings');

    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: data.chatMessageId,
        },
        relations: [
          'sender',
          'sender.profile',
          'group',
          'group.settings',
          'group.settings.user',
        ],
      });

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
    } catch (e: any) {
      this.logger.debug(e);
    }

    this.logger.debug('Update unRead settings completed');
    this.rmqService.ack(context);
  }

  @EventPattern('saveMsgAndSendNoti')
  async saveMsgAndSendNoti(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      if (data) {
        // Change updated at
        await this.groupChatService.updatedAt(data.groupChat.id);

        // Save latest message for group
        data.groupChat.latestMessage = data.newMessage;
        await this.groupChatService.update(data.groupChat.id, {
          latestMessage: data.groupChat.latestMessage,
        });

        if (data.newMessage.group.latestMessage) {
          delete data.newMessage.group.latestMessage;
        }

        if (data.newMessage.group.settings?.length) {
          data.newMessage.group.settings.forEach((x) => delete x.groupChat);
        }

        await Promise.all(
          data.groupChat.members.map(async (member) => {
            const setting = await this.groupChatService.findSetting(
              member.id,
              data.groupChat.id,
            );

            if (setting) {
              if (
                !data.insideGroupMembers.some((x) => x.id === setting.user.id)
              ) {
                if (
                  !this.onlineSessions.getUserSession(setting.user.id) &&
                  !setting.muteNotification
                ) {
                  // get friendship
                  const friendship = await this.userService.findFriendship(
                    setting.user.id,
                    data.sender.id,
                  );

                  // send notification
                  this.sendMessageNotification(
                    data.groupChat,
                    data.sender,
                    setting.user,
                    friendship,
                    data.newMessage,
                  );
                }

                await this.groupSettingRepo.update(setting.id, {
                  unReadMessages: setting.unReadMessages + 1,
                });
              }
            }
          }),
        );
      }
    } catch (e: any) {
      this.logger.debug(e);
    }
    this.rmqService.ack(context);
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
      title =
        friendship && friendship.nickname
          ? friendship.nickname
          : sender.username;
      content = `${messageContent}`;
    }

    this.notifyService.sendWithQueue({
      title,
      content,
      userId: receiver.id,
      user: receiver,
      imageUrl: sender.profile.avatar,
      notificationType: ENotificationType.UNREAD_MESSAGE,
      data: { groupId: group.id },
    });
  }
}

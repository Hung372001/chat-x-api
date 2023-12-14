import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '../../rmq/rmq.service';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { Connection, Repository } from 'typeorm';
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
import moment from 'moment';
import { TelegramLoggerService } from '../../logger/telegram.logger-service';
import { CacheService } from '../../cache/cache.service';

@Controller()
export class ChatMessageConsumer {
  private readonly logger = new Logger(ChatMessageConsumer.name);
  cacheMessageParallel = +process.env.CAHE_MESSAGE_PARALLEL ?? 10;

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
    @InjectConnection() private readonly connection: Connection,
    @Inject(TelegramLoggerService)
    private telegramLogger: TelegramLoggerService,
    @Inject(CacheService) private cacheService: CacheService,
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

      const unReadSettings = chatMessage.group?.settings?.filter(
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

  @EventPattern('saveMsg')
  async saveMsg(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      if (data) {
        const beginTime = moment.utc();
        const id = `${data.groupChat.id} - ${data.newMessage.message?.slice(
          0,
          10,
        )}`;
        const logs = [
          `${moment.utc().toISOString()} - ${id} - Begin save message`,
        ];

        const timeoutMsgCK = `TimeoutMsg_${data.groupChat.id}`;
        let timeoutMsg = await this.cacheService.get(timeoutMsgCK);
        const fullTimeoutMsgCK = `Fullmessage_${data.groupChat.id}`;
        let fullTimeoutMsg = await this.cacheService.get(fullTimeoutMsgCK);
        const latestMessageCK = `LatestMsg_${data.groupChat.id}`;
        const allMsgCK = `AllMessage`;
        let allMsg = await this.cacheService.get(allMsgCK);

        if (timeoutMsg?.length && fullTimeoutMsg?.length && allMsg?.length) {
          timeoutMsg.push({
            ...data.newMessage,
            sender: {
              id: data.sender.id,
            },
            group: { id: data.groupChat.id },
            nameCard: data.nameCard ? { id: data.nameCard.id } : null,
          });

          fullTimeoutMsg.push({
            ...data.newMessage,
            sender: data.sender,
            group: { id: data.groupChat.id },
            nameCard: data.nameCard,
          });

          allMsg.push({
            groupChatId: data.groupChat.id,
            chatMessageId: data.newMessage.id,
          });
        } else {
          timeoutMsg = [
            {
              ...data.newMessage,
              sender: {
                id: data.sender.id,
              },
              group: { id: data.groupChat.id },
              nameCard: data.nameCard ? { id: data.nameCard.id } : null,
            },
          ];

          fullTimeoutMsg = [
            {
              ...data.newMessage,
              sender: data.sender,
              group: { id: data.groupChat.id },
              nameCard: data.nameCard,
            },
          ];

          allMsg = [
            {
              groupChatId: data.groupChat.id,
              chatMessageId: data.newMessage.id,
            },
          ];
        }

        if (timeoutMsg.length > this.cacheMessageParallel) {
          await this.chatMessageRepo
            .createQueryBuilder()
            .insert()
            .into(ChatMessage)
            .values(timeoutMsg)
            .onConflict('do nothing')
            .execute();

          logs.push(
            `${moment.utc().toISOString()} - ${id} - Begin save group chat`,
          );

          // Save latest message for group
          await this.connection.query(`
                update "group_chat"
                set "latestMessageId" = '${
                  data.newMessage.id
                }', "updated_at" = '${moment.utc().toISOString()}'
                where "id" = '${data.groupChat.id}'
              `);

          await this.cacheService.set(timeoutMsgCK, []);
          await this.cacheService.set(fullTimeoutMsgCK, []);
          await this.cacheService.set(allMsgCK, []);
        } else {
          // Save latest message for group
          await this.connection.query(`
            update "group_chat"
            set "updated_at" = '${moment.utc().toISOString()}'
            where "id" = '${data.groupChat.id}'
          `);
          await this.cacheService.set(timeoutMsgCK, timeoutMsg);
          await this.cacheService.set(fullTimeoutMsgCK, fullTimeoutMsg);
          await this.cacheService.set(allMsgCK, allMsg);
        }

        await this.cacheService.set(latestMessageCK, {
          ...data.newMessage,
          nameCard: data.nameCard,
          group: { id: data.groupChat.id },
        });

        logs.push(`${moment.utc().toISOString()} - ${id} - End send message`);

        if (moment.utc().add(-3, 's').isAfter(beginTime)) {
          await this.telegramLogger.error(logs);
        }
      }
    } catch (e: any) {
      this.logger.debug(e);
    }
    this.rmqService.ack(context);
  }

  @EventPattern('sendMsgNoti')
  async sendMsgNoti(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      if (data) {
        data.newMessage.sender = data.sender;
        data.newMessage.group = data.groupChat;

        await Promise.all(
          data.groupChat.members.map(async (member) => {
            if (member.id !== data.newMessage.sender.id) {
              const setting = await this.groupChatService.findSetting(
                member.id,
                data.groupChat.id,
              );

              if (setting) {
                if (
                  !data.insideGroupMembers.some((x) => x.id === setting.user.id)
                ) {
                  if (
                    data.onlineUsers &&
                    !data.onlineUsers[setting.user.id] &&
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
            }
          }),
        );
      }
    } catch (e: any) {
      this.logger.debug(e);
    }
    this.rmqService.ack(context);
  }

  @EventPattern('readMessages')
  async readMessages(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      if (data) {
        await this.connection.query(`
          update "chat_message"
          set "isRead" = true
          where "groupId" = '${data.groupId}' and "isRead" = false
        `);

        await this.updateUnReadMessages(data.groupId, data.user.id);
      }
    } catch (e: any) {
      this.logger.debug(e);
    }
    this.rmqService.ack(context);
  }

  async updateUnReadMessages(groupId: string, userId: string) {
    await this.connection.query(`
      update "group_chat_setting"
      set "unReadMessages" = 0
      where "groupChatId" = '${groupId}' and "userId" = '${userId}'
    `);
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

    this.notifyService.sendWithoutQueue({
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

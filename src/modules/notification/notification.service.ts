import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import * as firebase from 'firebase-admin';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ICreateNotificationResponse } from './interfaces/create-notification.interface';
import { ClientProxy } from '@nestjs/microservices';
import { ChatXFirebase } from '../../configs/firebase';
import { FCMTokenService } from '../fcm-token/fcm-token.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { omitBy, isNull } from 'lodash';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';
import { ConfigService } from '@nestjs/config';
import { ERmqQueueName } from '../../common/enums/rmq.enum';

firebase.initializeApp({
  credential: firebase.credential.cert({
    projectId: ChatXFirebase.project_id,
    clientEmail: ChatXFirebase.client_email,
    privateKey: ChatXFirebase.private_key,
  }),
});

@Injectable()
export class NotificationService {
  private turnOnNoti = false;
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @InjectRepository(GroupChatSetting)
    private readonly groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserService) private userService: UserService,
    @Inject(FCMTokenService) private fcmTokenService: FCMTokenService,
    @Inject(ERmqQueueName.NOTIFICATION) private rmqClient: ClientProxy,
  ) {
    this.turnOnNoti = this.configService.get('TURN_ON_NOTIFICATION') === 'true';
  }

  async countUnread(userId: string): Promise<number> {
    return this.groupSettingRepo
      .createQueryBuilder('group_chat_setting')
      .where('group_chat_setting.userId = :userId', { userId })
      .andWhere('group_chat_setting.unReadMessages > 0')
      .getCount();
  }

  async create(
    dto: CreateNotificationDto,
  ): Promise<ICreateNotificationResponse> {
    try {
      if (dto.user) {
        dto.user = await this.userService.findOne({ id: dto.userId });

        if (!dto.user) {
          throw { message: 'Không tìm thấy người dùng.' };
        }
      }

      return {
        notification: dto as unknown as Notification,
        fcmTokens: await this.fcmTokenService.findByUser(dto.user.id),
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  send(dto: CreateNotificationDto) {
    if (this.turnOnNoti) {
      return this.rmqClient.emit('sendNotification', dto);
    }
  }

  async testing(dto: SendNotificationDto) {
    try {
      await this.fcmSendMessage(
        {
          title: dto.title,
          content: dto.content,
          data: { groupId: 'de9f742a-8487-4957-b5a7-0b7458edfc74' },
        } as Notification,
        dto.deviceToken,
      );

      return { message: 'Thông báo được gửi thành công.' };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async createAndSend(dto: CreateNotificationDto) {
    try {
      const { notification: newMessage, fcmTokens } = await this.create(dto);
      if (newMessage) {
        if (fcmTokens?.length > 0) {
          await Promise.all(
            fcmTokens.map(async (fcmToken) => {
              await this.fcmSendMessage(newMessage, fcmToken.deviceToken);
            }),
          );
        }
      }
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async fcmSendMessage(notification: Notification, deviceToken: string) {
    try {
      const unreadCount = notification?.user?.id
        ? await this.countUnread(notification.user.id)
        : 0;
      await firebase
        .messaging()
        .send({
          notification: omitBy(
            {
              title: notification.title,
              body: notification.content,
              imageUrl: notification.imageUrl,
            },
            isNull,
          ),
          token: deviceToken,
          data: {
            ...notification.data,
            unreadCount: unreadCount?.toString() ?? '0',
          },
          android: {
            notification: omitBy(
              {
                notificationCount: 1,
                sound: notification?.user.soundNotification ? 'default' : null,
              },
              isNull,
            ),
          },
          apns: {
            payload: {
              aps: omitBy(
                {
                  sound: notification?.user.soundNotification
                    ? 'default'
                    : null,
                  badge: 1,
                  data: {
                    ...notification.data,
                    unreadCount: unreadCount?.toString() ?? '0',
                  },
                },
                isNull,
              ),
            },
          },
        })
        .catch((error: any) => {
          console.error(error);
          if (
            error.errorInfo.code ===
              'messaging/registration-token-not-registered' ||
            error.errorInfo.code === 'messaging/mismatched-credential'
          ) {
            return this.fcmTokenService.clearToken(deviceToken);
          }
        });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

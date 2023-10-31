import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import * as firebase from 'firebase-admin';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { pick } from 'lodash';
import { ICreateNotificationResponse } from './interfaces/create-notification.interface';
import { ClientProxy } from '@nestjs/microservices';
import { ChatXFirebase } from '../../configs/firebase';
import { FCMTokenService } from '../fcm-token/fcm-token.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { omitBy, isNull } from 'lodash';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';

firebase.initializeApp({
  credential: firebase.credential.cert({
    projectId: ChatXFirebase.project_id,
    clientEmail: ChatXFirebase.client_email,
    privateKey: ChatXFirebase.private_key,
  }),
});

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(GroupChatSetting)
    private readonly groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserService) private userService: UserService,
    @Inject(FCMTokenService) private fcmTokenService: FCMTokenService,
    @Inject('NOTIFICATION_SERVICE') private rmqClient: ClientProxy,
  ) {}

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
      const foundUser = await this.userService.findOne({ id: dto.userId });

      if (!foundUser) {
        throw { message: 'Không tìm thấy người dùng.' };
      }

      const newNotification = await this.notificationRepository.create({
        ...pick(dto, Object.keys(dto)),
        user: foundUser,
      } as Notification);

      await this.notificationRepository.save(newNotification);

      return {
        notification: newNotification,
        fcmTokens: await this.fcmTokenService.findByUser(foundUser.id),
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  send(dto: CreateNotificationDto) {
    return this.rmqClient.emit('sendNotification', dto);
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
            'messaging/registration-token-not-registered'
          ) {
            return this.fcmTokenService.clearToken(deviceToken);
          }
        });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

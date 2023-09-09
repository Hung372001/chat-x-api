import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { SendNotificationDto } from './dto/send-notification.dto';
import * as firebase from 'firebase-admin';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { pick } from 'lodash';
import { ICreateNotificationResponse } from './interfaces/create-notification.interface';
import { ClientProxy } from '@nestjs/microservices';
import { ChatXFirebase } from '../../configs/firebase';
import { FCMTokenService } from '../fcm-token/fcm-token.service';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../user/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';

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
    @Inject(UserService) private userService: UserService,
    @Inject(FCMTokenService) private fcmTokenService: FCMTokenService,
    @Inject('NOTIFICATION_SERVICE') private rmqClient: ClientProxy,
  ) {}

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
      await firebase
        .messaging()
        .send({
          notification: {
            title: notification.title,
            body: notification.content,
          },
          token: deviceToken,
        })
        .catch((error: any) => {
          console.error(error);
        });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

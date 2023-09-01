import { Notification } from '../entities/notification.entity';
import { FCMToken } from '../../fcm-token/entities/fcm-token.entity';

export interface ICreateNotificationResponse {
  notification: Notification;
  fcmTokens: Array<FCMToken>;
}

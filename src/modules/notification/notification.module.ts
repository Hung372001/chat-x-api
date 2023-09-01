import { Module } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationConsumer } from './consumers/notification.consumer';
import { RmqModule } from '../rmq/rmq.module';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { NotificationRequestService } from './notification.request.service';
import { FCMTokenModule } from '../fcm-token/fcm-token.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    RmqModule.register({
      name: 'NOTIFICATION_SERVICE',
    }),
    UserModule,
    FCMTokenModule,
  ],
  controllers: [NotificationController, NotificationConsumer],
  providers: [NotificationService, NotificationRequestService],
  exports: [NotificationService, NotificationRequestService],
})
export class NotificationModule {}

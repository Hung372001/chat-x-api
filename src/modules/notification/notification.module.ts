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
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';
import { ERmqPrefetch, ERmqQueueName } from '../../common/enums/rmq.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, GroupChatSetting]),
    RmqModule.register({
      name: ERmqQueueName.NOTIFICATION,
      queueName: ERmqQueueName.NOTIFICATION,
      prefetchCount: ERmqPrefetch.NOTIFICATION,
    }),
    UserModule,
    FCMTokenModule,
  ],
  controllers: [NotificationController, NotificationConsumer],
  providers: [NotificationService, NotificationRequestService],
  exports: [NotificationService, NotificationRequestService],
})
export class NotificationModule {}

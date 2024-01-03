import { Module } from '@nestjs/common';
import { FCMTokenService } from './fcm-token.service';
import { FCMTokenController } from './fcm-token.controller';
import { FCMToken } from './entities/fcm-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FCMTokenRequestService } from './fcm-token.request.service';
import { RmqModule } from '../rmq/rmq.module';
import { FCMTokenConsumer } from './consumers/fcm-token.consumer';
import { ERmqPrefetch, ERmqQueueName } from '../../common/enums/rmq.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([FCMToken]),
    RmqModule.register({
      name: ERmqQueueName.NOTIFICATION,
      queueName: ERmqQueueName.NOTIFICATION,
      prefetchCount: ERmqPrefetch.NOTIFICATION,
    }),
  ],
  controllers: [FCMTokenController, FCMTokenConsumer],
  providers: [FCMTokenService, FCMTokenRequestService],
  exports: [FCMTokenService, FCMTokenRequestService],
})
export class FCMTokenModule {}

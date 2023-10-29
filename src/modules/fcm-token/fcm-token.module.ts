import { Module } from '@nestjs/common';
import { FCMTokenService } from './fcm-token.service';
import { FCMTokenController } from './fcm-token.controller';
import { FCMToken } from './entities/fcm-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FCMTokenRequestService } from './fcm-token.request.service';
import { RmqModule } from '../rmq/rmq.module';
import { FCMTokenConsumer } from './consumers/fcm-token.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([FCMToken]),
    RmqModule.register({
      name: 'NOTIFICATION_SERVICE',
    }),
  ],
  controllers: [FCMTokenController, FCMTokenConsumer],
  providers: [FCMTokenService, FCMTokenRequestService],
  exports: [FCMTokenService, FCMTokenRequestService],
})
export class FCMTokenModule {}

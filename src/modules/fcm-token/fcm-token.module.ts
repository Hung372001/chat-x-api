import { Module } from '@nestjs/common';
import { FCMTokenService } from './fcm-token.service';
import { FCMTokenController } from './fcm-token.controller';
import { FCMToken } from './entities/fcm-token.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FCMTokenRequestService } from './fcm-token.request.service';

@Module({
  imports: [TypeOrmModule.forFeature([FCMToken])],
  controllers: [FCMTokenController],
  providers: [FCMTokenService, FCMTokenRequestService],
  exports: [FCMTokenService, FCMTokenRequestService],
})
export class FCMTokenModule {}

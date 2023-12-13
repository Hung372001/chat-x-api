import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendController } from './friend.controller';
import { FriendRequestService } from './friend.request.service';
import { FriendRequest } from './entities/friend-request.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { User } from '../user/entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { CustomeCacheModule } from '../cache/cache.module';
import { RmqModule } from '../rmq/rmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FriendRequest, Friendship]),
    GatewayModule,
    CustomeCacheModule,
    RmqModule.register({
      name: 'CHAT_GATEWAY',
      queueName: 'CHAT_GATEWAY_QUEUE_NAME',
    }),
  ],
  controllers: [FriendController],
  providers: [FriendRequestService],
  exports: [FriendRequestService],
})
export class FriendModule {}

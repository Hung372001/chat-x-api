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
import { ERmqPrefetch, ERmqQueueName } from '../../common/enums/rmq.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FriendRequest, Friendship]),
    GatewayModule,
    CustomeCacheModule,
    RmqModule.register({
      name: ERmqQueueName.CHAT_GATEWAY,
      queueName: ERmqQueueName.CHAT_GATEWAY,
      prefetchCount: ERmqPrefetch.CHAT_GATEWAY,
    }),
  ],
  controllers: [FriendController],
  providers: [FriendRequestService],
  exports: [FriendRequestService],
})
export class FriendModule {}

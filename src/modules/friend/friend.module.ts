import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendController } from './friend.controller';
import { FriendRequestService } from './friend.request.service';
import { FriendRequest } from './entities/friend-request.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { User } from '../user/entities/user.entity';
import { Friendship } from './entities/friendship.entity';
import { CustomeCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, FriendRequest, Friendship]),
    GatewayModule,
    CustomeCacheModule,
  ],
  controllers: [FriendController],
  providers: [FriendRequestService],
  exports: [FriendRequestService],
})
export class FriendModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleModule } from '../role/role.module';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { Profile } from '../profile/entities/profile.entity';
import { UserRequestService } from './user.request.service';
import { RollCall } from './entities/roll-call.entity';
import { FriendRequest } from '../friend/entities/friend-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, FriendRequest, RollCall]),
    RoleModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRequestService],
  exports: [UserService, UserRequestService],
})
export class UserModule {}

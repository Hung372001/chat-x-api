import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import {} from '../gateway/services/group-chat.gateway.service';
import { GroupChatSettingController } from './controllers/group-chat-setting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatSettingRequestService } from './services/group-chat-setting.request.service';
import { GatewayModule } from '../gateway/gateway.module';
import { GroupChatService } from './services/group-chat.service';
import { GroupChatSetting } from './entities/group-chat-setting.entity';
import { GroupChatController } from './controllers/group-chat.controller';
import { GroupChatRequestService } from './services/group-chat.request.service';
import { Friendship } from '../friend/entities/friendship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Friendship, GroupChat, GroupChatSetting]),
    UserModule,
    GatewayModule,
  ],
  controllers: [GroupChatController, GroupChatSettingController],
  providers: [
    GroupChatRequestService,
    GroupChatService,
    GroupChatSettingRequestService,
  ],
  exports: [
    GroupChatRequestService,
    GroupChatService,
    GroupChatSettingRequestService,
  ],
})
export class GroupChatModule {}

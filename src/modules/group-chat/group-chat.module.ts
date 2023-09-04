import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import {} from '../gateway/services/group-chat.gateway.service';
import { GroupChatController } from './group-chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatRequestService } from './group-chat.request.service';
import { GatewayModule } from '../gateway/gateway.module';
import { GroupChatService } from './group-chat.service';
import { GroupChatMember } from './entities/group-chat-member.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupChat, GroupChatMember]),
    UserModule,
    GatewayModule,
  ],
  controllers: [GroupChatController],
  providers: [GroupChatRequestService, GroupChatService],
  exports: [GroupChatRequestService, GroupChatService],
})
export class GroupChatModule {}

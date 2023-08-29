import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { CustomeCacheModule } from '../cache/cache.module';
import { GroupChatModule } from '../group-chat/group-chat.module';
import { ChatMessageModule } from '../chat-message/chat-message.module';

@Module({
  imports: [UserModule, JwtModule, GroupChatModule, ChatMessageModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}

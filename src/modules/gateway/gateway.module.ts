import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { CustomeCacheModule } from '../cache/cache.module';
import { GroupChatModule } from '../group-chat/group-chat.module';
import { ChatMessageModule } from '../chat-message/chat-message.module';
import { GatewaySessionManager } from './gateway.session';

@Module({
  imports: [UserModule, JwtModule, GroupChatModule, ChatMessageModule],
  providers: [AppGateway, GatewaySessionManager],
  exports: [AppGateway, GatewaySessionManager],
})
export class GatewayModule {}

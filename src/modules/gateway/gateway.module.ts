import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { GatewaySessionManager } from './gateway.session';
import { GroupChatGatewayService } from './services/group-chat.gateway.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { ChatMessageGatewayService } from './services/chat-message.request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupChat, ChatMessage]),
    UserModule,
    JwtModule,
  ],
  providers: [
    AppGateway,
    GatewaySessionManager,
    GroupChatGatewayService,
    ChatMessageGatewayService,
  ],
  exports: [
    AppGateway,
    GatewaySessionManager,
    GroupChatGatewayService,
    ChatMessageGatewayService,
  ],
})
export class GatewayModule {}

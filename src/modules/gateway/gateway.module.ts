import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { GatewaySessionManager } from './sessions/gateway.session';
import { GroupChatGatewayService } from './services/group-chat.gateway.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { ChatMessageGatewayService } from './services/chat-message.request.service';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupChat, ChatMessage, GroupChatSetting]),
    UserModule,
    JwtModule,
    NotificationModule,
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

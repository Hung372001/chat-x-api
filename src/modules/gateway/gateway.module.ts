import { JwtModule } from '@nestjs/jwt';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { GatewaySessionManager } from './sessions/gateway.session';
import { GroupChatGatewayService } from './services/group-chat.gateway.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { ChatMessageGatewayService } from './services/chat-message.gateway.service';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';
import { NotificationModule } from '../notification/notification.module';
import { OnlinesSessionManager } from './sessions/onlines.session';
import { UserGatewayService } from './services/user.gateway.service';
import { User } from '../user/entities/user.entity';
import { Friendship } from '../friend/entities/friendship.entity';
import { RmqModule } from '../rmq/rmq.module';
import { ChatMessageConsumer } from './consumers/chat-message.consumer';
import { CustomeCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupChat,
      ChatMessage,
      GroupChatSetting,
      User,
      Friendship,
    ]),
    JwtModule.register({}),
    NotificationModule,
    RmqModule.register({
      name: 'CHAT-MESSAGE_SERVICE',
    }),
    RmqModule.register({
      name: 'NOTI_SERVICE',
      queueName: 'NOTI_QUEUE_NAME',
    }),
    CustomeCacheModule,
  ],
  controllers: [ChatMessageConsumer],
  providers: [
    AppGateway,
    GatewaySessionManager,
    OnlinesSessionManager,
    GroupChatGatewayService,
    ChatMessageGatewayService,
    UserGatewayService,
  ],
  exports: [
    AppGateway,
    GatewaySessionManager,
    OnlinesSessionManager,
    GroupChatGatewayService,
    ChatMessageGatewayService,
    UserGatewayService,
  ],
})
export class GatewayModule {}

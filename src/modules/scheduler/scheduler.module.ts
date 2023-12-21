import { Module } from '@nestjs/common';
import { GroupChatScheduler } from './group-chat.scheduler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';
import { AllChatMessage } from '../chat-message/entities/all-chat-message.entity';
import { ChatMessageScheduler } from './chat-message.scheduler';
import { CustomeCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupChat,
      ChatMessage,
      AllChatMessage,
      GroupChatSetting,
    ]),
    CustomeCacheModule,
  ],
  providers: [GroupChatScheduler, ChatMessageScheduler],
})
export class SchedulerModule {}

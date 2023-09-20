import { Module } from '@nestjs/common';
import { GroupChatScheduler } from './group-chat.scheduler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupChat, ChatMessage, GroupChatSetting]),
  ],
  providers: [GroupChatScheduler],
})
export class SchedulerModule {}

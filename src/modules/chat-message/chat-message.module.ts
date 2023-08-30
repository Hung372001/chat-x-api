import { Module } from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { ChatMessageController } from './chat-message.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { GroupChatModule } from '../group-chat/group-chat.module';
import { ChatMessageRequestService } from './chat-message.request.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage]), GroupChatModule],
  controllers: [ChatMessageController],
  providers: [ChatMessageService, ChatMessageRequestService],
  exports: [ChatMessageService, ChatMessageRequestService],
})
export class ChatMessageModule {}

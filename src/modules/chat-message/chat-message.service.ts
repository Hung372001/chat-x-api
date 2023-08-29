import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { BaseService } from '../../common/services/base.service';
import { NewMessageDto } from './dto/new-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { GroupChat } from '../group-chat/entities/group-chat.entity';

@Injectable()
export class ChatMessageService extends BaseService<ChatMessage> {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
  ) {
    super(chatMessageRepo);
  }

  async createWithSender(
    dto: NewMessageDto,
    sender: User,
    groupChat: GroupChat,
  ): Promise<ChatMessage> {
    try {
      const newMessage = await this.chatMessageRepo.create({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrl: dto.documentUrl,
        sender,
        group: groupChat,
      } as ChatMessage);

      return this.chatMessageRepo.save(newMessage);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateWithSender(
    id: string,
    updateObj: Partial<ChatMessage>,
    sender: User,
  ) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id,
        },
        relations: ['sender', 'group'],
      });

      if (!chatMessage || sender.id !== chatMessage.sender.id) {
        throw { message: 'Chat message is not found.' };
      }

      chatMessage.unsend = true;
      this.chatMessageRepo.save(chatMessage);

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

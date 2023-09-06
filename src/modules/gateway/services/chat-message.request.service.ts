import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { GroupChatGatewayService } from './group-chat.gateway.service';
import { SendMessageDto } from '../../chat-message/dto/send-message.dto';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';

@Injectable()
export class ChatMessageGatewayService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
  ) {}

  async sendMessage(dto: SendMessageDto, sender: User, groupChat?: GroupChat) {
    try {
      if (!groupChat) {
        groupChat = await this.groupChatService.findOne({
          id: dto.groupId,
        });
      }

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (
        !groupChat.members.some((x) => x.id === sender.id) &&
        !groupChat.admins.some((x) => x.id === sender.id)
      ) {
        throw {
          message: 'Phải là thành viên nhóm chat mới được gửi tin nhắn.',
        };
      }

      const newMessage = await this.chatMessageRepo.create({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender,
        group: groupChat,
      } as ChatMessage);

      await this.chatMessageRepo.save(newMessage);

      // Save latest message for group
      groupChat.latestMessage = newMessage;
      await this.groupChatService.update(groupChat.id, {
        latestMessage: groupChat.latestMessage,
      });

      return newMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async togglePinMessage(id: string, user: User, pinMessage: boolean) {
    try {
      const message = await this.chatMessageRepo.findOne({
        where: { id },
        relations: ['group', 'group.admins'],
      });

      if (!message) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (message.pinned && pinMessage) {
        throw { message: 'Tin nhắn đã được ghim.' };
      }

      if (!message.pinned && !pinMessage) {
        throw { message: 'Tin nhắn đã được bỏ ghim.' };
      }

      if (!message.group.admins.some((x) => x.id === user.id)) {
        throw {
          message: `Quản trị viên mới có quyền ${
            pinMessage ? 'ghim' : 'bỏ ghim'
          } tin nhắn`,
        };
      }

      message.pinned = pinMessage;
      await this.chatMessageRepo.update(id, { pinned: pinMessage });

      return message;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async unsendMessage(chatMessageId: string, unsender: User) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'group', 'group.admins'],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (
        !chatMessage.group.admins.some((x) => x.id === unsender.id) &&
        unsender.id !== chatMessage.sender.id
      ) {
        throw {
          message:
            'Chỉ có quản trị viên và người gửi mới có quyền thu hồi tin nhắn.',
        };
      }

      chatMessage.unsent = true;
      chatMessage.unsentBy = unsender;
      this.chatMessageRepo.save(chatMessage);

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(chatMessageId: string, deleteBy: User) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'group', 'group.members', 'deleteBy'],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (!chatMessage.group.members.some((x) => x.id === deleteBy.id)) {
        throw {
          message: 'Bạn không phải là thành viên nhóm chat.',
        };
      }

      if (chatMessage.deletesBy.some((x) => x.id === deleteBy.id)) {
        throw {
          message: 'Tin nhắn này đã được xoá.',
        };
      }

      chatMessage.deletesBy.push(deleteBy);

      return this.chatMessageRepo.update(chatMessage.id, {
        deletesBy: chatMessage.deletesBy,
      });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

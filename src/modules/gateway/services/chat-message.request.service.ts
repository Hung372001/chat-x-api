import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { GroupChatGatewayService } from './group-chat.gateway.service';
import { SendMessageDto } from '../../chat-message/dto/send-message.dto';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { UserService } from '../../user/user.service';
import moment from 'moment';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';

@Injectable()
export class ChatMessageGatewayService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
    @Inject(UserService)
    private userService: UserService,
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

      if (!groupChat.enabledChat) {
        throw { message: 'Tính năng chat đang bị khóa.' };
      }

      if (
        !groupChat.members.some((x) => x.id === sender.id) &&
        !groupChat.admins.some((x) => x.id === sender.id)
      ) {
        throw {
          message: 'Phải là thành viên nhóm chat mới được gửi tin nhắn.',
        };
      }

      let nameCard = null;
      if (dto.nameCardUserId) {
        nameCard = await this.userService.findOne({ id: dto.nameCardUserId });

        if (!nameCard) {
          throw {
            message: 'Không tìm thấy danh thiếp.',
          };
        }
      }

      const newMessage = await this.chatMessageRepo.create({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender,
        group: groupChat,
        nameCard,
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

      if (message.group.type === EGroupChatType.GROUP) {
        if (!message.group.admins.some((x) => x.id === user.id)) {
          throw {
            message: `Quản trị viên mới có quyền ${
              pinMessage ? 'ghim' : 'bỏ ghim'
            } tin nhắn`,
          };
        }
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

      if (chatMessage.unsent) {
        throw { message: 'Tin nhắn đã được thu hồi.' };
      }

      if (chatMessage.pinned) {
        throw { message: 'Bỏ ghim để thu hồi tin nhắn.' };
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

  async remove(chatMessageId: string, deletedBy: User) {
    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'group', 'group.members'],
      });

      if (!chatMessage) {
        throw { message: 'Không tìm thấy tin nhắn.' };
      }

      if (chatMessage.pinned) {
        throw { message: 'Bỏ ghim để xóa tin nhắn.' };
      }

      if (!chatMessage.group.members.some((x) => x.id === deletedBy.id)) {
        throw {
          message: 'Bạn không phải là thành viên nhóm chat.',
        };
      }

      chatMessage.deletedAt = moment.utc().toDate();
      await this.chatMessageRepo.update(chatMessage.id, { deletedBy });
      await this.chatMessageRepo.softDelete(chatMessage.id);

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

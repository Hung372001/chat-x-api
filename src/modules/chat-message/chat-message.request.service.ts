import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { FilterDto } from '../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { GroupChatService } from '../group-chat/group-chat.service';
import { AppGateway } from '../gateway/app.gateway';
import { SendNewMessageDto } from './dto/send-new-message.dto';

@Injectable({ scope: Scope.REQUEST })
export class ChatMessageRequestService extends BaseService<ChatMessage> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    private groupChatService: GroupChatService,
    @Inject(AppGateway) private readonly gateway: AppGateway,
  ) {
    super(chatMessageRepo);
  }

  async findAllForGroupChat(groupChatId: string, query: FilterDto) {
    const currentUser = this.request.user as User;

    const groupChat = await this.groupChatService.findOne({ id: groupChatId });

    if (!groupChat || !groupChat.members.some((x) => x.id === currentUser.id)) {
      throw { message: 'Không tìm thấy nhóm chat.' };
    }

    const {
      keyword = '',
      andKeyword = '',
      searchAndBy = '',
      searchBy = !query.searchBy && !query.searchAndBy
        ? ['name']
        : query.searchBy,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 10,
      page = 1,
      isGetAll = false,
    } = query;

    const queryBuilder = this.chatMessageRepo
      .createQueryBuilder('chat_message')
      .leftJoin('chat_message.group', 'group_chat')
      .leftJoinAndSelect('chat_message.sender', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('group_chat.id = :groupChatId', { groupChatId });

    if (keyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`keyword_${index}`] = !Array.isArray(keyword)
            ? `%${keyword}%`
            : `%${keyword[index]}%`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `chat_message.${item}` : item
            } as text) ilike :keyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`keyword_${index}`] = !Array.isArray(keyword)
                ? `%${keyword}%`
                : `%${keyword[index]}%`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `chat_message.${item}` : item
                } as text) ilike :keyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    // search ilike
    if (andKeyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`equalKeyword_${index}`] = !Array.isArray(andKeyword)
            ? `${andKeyword}`
            : `${andKeyword[index]}`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `chat_message.${item}` : item
            } as text) ilike :andKeyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`andKeyword${index}`] = !Array.isArray(andKeyword)
                ? `${andKeyword}`
                : `${andKeyword[index]}`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `chat_message.${item}` : item
                } as text) ilike :andKeyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    const [items, total] = await queryBuilder
      .orderBy(`chat_message.${sortBy}`, sortOrder)
      .take(isGetAll ? null : limit)
      .skip(isGetAll ? null : (page - 1) * limit)
      .getManyAndCount();

    return {
      items,
      total,
    };
  }

  async sendNewMessage(dto: SendNewMessageDto) {
    try {
      const currentUser = this.request.user as User;

      const groupChat = await this.groupChatService.findOneBy({
        id: dto.groupId,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const newMessage = await this.chatMessageRepo.create({
        message: dto.message,
        imageUrls: dto.imageUrls,
        documentUrls: dto.documentUrls,
        sender: currentUser,
        group: groupChat,
      } as ChatMessage);

      this.chatMessageRepo.save(newMessage);

      // Call socket to group
      await this.gateway.createNewMessage(newMessage);

      return newMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async unsendMessage(chatMessageId) {
    try {
      const currentUser = this.request.user as User;

      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'group'],
      });

      if (!chatMessage || currentUser.id !== chatMessage.sender.id) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      chatMessage.unsend = true;
      this.chatMessageRepo.save(chatMessage);

      // Call socket to group
      await this.gateway.unsendMessage(chatMessage);

      return chatMessage;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  override async remove(chatMessageId: string) {
    try {
      const currentUser = this.request.user as User;

      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: chatMessageId,
        },
        relations: ['sender', 'group'],
      });

      if (!chatMessage || currentUser.id !== chatMessage.sender.id) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      return this.chatMessageRepo.softDelete(chatMessage.id);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

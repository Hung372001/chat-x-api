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

  async findAllForGroupChat(
    groupChatId: string,
    contactUserId: string,
    query: FilterDto,
  ) {
    const currentUser = this.request.user as User;

    let groupChat = null;
    if (groupChatId) {
      groupChat = await this.groupChatService.findOne({ id: groupChatId });
    }

    if (contactUserId) {
      groupChat = await this.groupChatService.getGroupChatDou([
        currentUser.id,
        contactUserId,
      ]);
    }

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
      .leftJoin('chat_message.deletesBy', 'user as delMsgUsers')
      .where('group_chat.id = :groupChatId', { groupChatId: groupChat.id })
      .andWhere('user as delMsgUsers.id != :userId', { userId: currentUser.id })
      .andWhere('chat_message.pinned = false');

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

    const pinnedMessages = await this.chatMessageRepo
      .createQueryBuilder('chat_message')
      .leftJoin('chat_message.group', 'group_chat')
      .leftJoinAndSelect('chat_message.sender', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('chat_message.pinnedBy', 'user as pinner')
      .leftJoinAndSelect('user as pinner.profile', 'profile as pinnerProfile')
      .where('group_chat.id = :groupChatId', { groupChatId: groupChat.id })
      .andWhere('chat_message.pinned = true')
      .orderBy(`chat_message.updated_at`, 'DESC')
      .getMany();

    return {
      items,
      pinnedMessages,
      total,
    };
  }
}

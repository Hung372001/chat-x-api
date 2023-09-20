import { Inject, Injectable, Scope } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { FilterDto } from '../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { GroupChatService } from '../group-chat/services/group-chat.service';
import { AppGateway } from '../gateway/app.gateway';
import { GroupChatSettingRequestService } from '../group-chat/services/group-chat-setting.request.service';
import { ERole } from '../../common/enums/role.enum';
import { omitBy, isNull } from 'lodash';

@Injectable({ scope: Scope.REQUEST })
export class ChatMessageRequestService extends BaseService<ChatMessage> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    private groupChatService: GroupChatService,
    private groupSettingService: GroupChatSettingRequestService,
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
    const isRootAdmin = currentUser.roles[0].type === ERole.ADMIN;

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

    if (
      !isRootAdmin &&
      (!groupChat || !groupChat.members.some((x) => x.id === currentUser.id))
    ) {
      throw { message: 'Không tìm thấy nhóm chat.' };
    }

    const adminPermission =
      currentUser.roles[0].type === ERole.ADMIN ||
      groupChat.admins.some((x) => x.id === currentUser.id);

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

    let chatSetting = null;
    if (!isRootAdmin) {
      chatSetting = await this.groupSettingService.getGroupSetting(
        groupChat.id,
        currentUser.id,
      );
    }

    const queryBuilder = this.chatMessageRepo
      .createQueryBuilder('chat_message')
      .leftJoin('chat_message.group', 'group_chat')
      .leftJoinAndSelect('chat_message.sender', 'user')
      .leftJoinAndSelect('user.friends', 'friendship')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoin('group_chat.settings', 'group_chat_setting')
      .leftJoin('chat_message.deletedBy', 'user as delMsgUser')
      .leftJoinAndSelect('chat_message.readsBy', 'user as readsByUser')
      .leftJoinAndSelect('chat_message.nameCard', 'user as nameCardUser')
      .leftJoinAndSelect(
        'user as nameCardUser.profile',
        'profile as nameCardProfile',
      )
      .where('group_chat.id = :groupChatId', { groupChatId: groupChat.id });

    if (!isRootAdmin) {
      queryBuilder.andWhere('group_chat_setting.userId = :userId', {
        userId: currentUser.id,
      });

      if (chatSetting.deleteMessageFrom) {
        queryBuilder.andWhere('chat_message.created_at >= :fromDate', {
          fromDate: chatSetting.deleteMessageFrom,
        });
      }
    }

    if (adminPermission) {
      queryBuilder.withDeleted();
    }

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
          whereParams[`andKeyword_${index}`] = !Array.isArray(andKeyword)
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
              whereParams[`andKeyword_${index}`] = !Array.isArray(andKeyword)
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
      .leftJoinAndSelect('user.friends', 'friendship')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('chat_message.pinnedBy', 'user as pinner')
      .leftJoinAndSelect('user as pinner.profile', 'profile as pinnerProfile')
      .where('group_chat.id = :groupChatId', { groupChatId: groupChat.id })
      .andWhere('friendship.toUserId = :friendId', {
        friendId: currentUser.id,
      })
      .andWhere('chat_message.pinned = true')
      .orderBy(`chat_message.updated_at`, 'DESC')
      .getMany();

    return {
      items: items.map((iterator) =>
        adminPermission || !iterator.unsent
          ? iterator
          : omitBy(
              {
                ...iterator,
                imageUrls: null,
                message: null,
                documentUrls: null,
                nameCard: null,
              },
              isNull,
            ),
      ),
      pinnedMessages,
      total,
    };
  }
}

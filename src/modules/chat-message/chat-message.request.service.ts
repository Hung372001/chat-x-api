import { Inject, Injectable, Scope } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Brackets, Connection, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { FilterDto } from '../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { GroupChatService } from '../group-chat/services/group-chat.service';
import { AppGateway } from '../gateway/app.gateway';
import { GroupChatSettingRequestService } from '../group-chat/services/group-chat-setting.request.service';
import { ERole } from '../../common/enums/role.enum';
import { omitBy, isNull } from 'lodash';
import { CacheService } from '../cache/cache.service';
import { UserGatewayService } from '../gateway/services/user.gateway.service';

@Injectable({ scope: Scope.REQUEST })
export class ChatMessageRequestService extends BaseService<ChatMessage> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    private groupChatService: GroupChatService,
    private groupSettingService: GroupChatSettingRequestService,
    private userService: UserGatewayService,
    @Inject(CacheService) private readonly cacheService: CacheService,
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

    if (contactUserId) {
      const groupChat = await this.groupChatService.getGroupChatDou([
        currentUser.id,
        contactUserId,
      ]);

      if (!groupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      groupChatId = groupChat?.id;
    }

    const isGroupAdmin = await this.groupChatService.isGroupAdmin(
      groupChatId,
      currentUser.id,
    );
    const adminPermission =
      currentUser.roles[0].type === ERole.ADMIN || isGroupAdmin;

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
        groupChatId,
        currentUser.id,
      );
    }

    const queryBuilder = this.chatMessageRepo
      .createQueryBuilder('chat_message')
      .leftJoin('chat_message.group', 'group_chat')
      .leftJoin('chat_message.sender', 'user')
      .addSelect([
        'user.id',
        'user.isActive',
        'user.deletedAt',
        'user.email',
        'user.phoneNumber',
        'user.username',
      ])
      .leftJoin('user.profile', 'profile')
      .addSelect(['profile.id', 'profile.avatar'])
      .leftJoinAndSelect('chat_message.nameCard', 'user as nameCardUser')
      .leftJoinAndSelect(
        'user as nameCardUser.profile',
        'profile as nameCardProfile',
      )
      .where('group_chat.id = :groupChatId', { groupChatId });

    if (!isRootAdmin) {
      if (chatSetting?.deleteMessageFrom) {
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

    const cacheKey = `PinnedMessage_${groupChatId}`;
    let pinnedMessages = await this.cacheService.get(cacheKey);

    if (!pinnedMessages) {
      pinnedMessages = await this.chatMessageRepo
        .createQueryBuilder('chat_message')
        .leftJoin('chat_message.group', 'group_chat')
        .leftJoin('chat_message.sender', 'user')
        .addSelect([
          'user.id',
          'user.isActive',
          'user.deletedAt',
          'user.email',
          'user.phoneNumber',
          'user.username',
        ])
        .leftJoin('user.profile', 'profile')
        .addSelect(['profile.id', 'profile.avatar'])
        .leftJoinAndSelect('chat_message.nameCard', 'user as nameCardUser')
        .leftJoinAndSelect(
          'user as nameCardUser.profile',
          'profile as nameCardProfile',
        )
        .where('group_chat.id = :groupChatId', { groupChatId })
        .andWhere('chat_message.pinned = true')
        .orderBy(`chat_message.updated_at`, 'DESC')
        .getMany();

      if (pinnedMessages?.length) {
        pinnedMessages = pinnedMessages.map((iterator) =>
          this.mappingFriendship(iterator, currentUser),
        );
      }

      await this.cacheService.set(cacheKey, pinnedMessages);
    }

    return {
      items: await Promise.all(
        items.map(async (iterator) =>
          adminPermission || !iterator.unsent
            ? await this.mappingFriendship(iterator, currentUser)
            : omitBy(
                {
                  ...(await this.mappingFriendship(iterator, currentUser)),
                  imageUrls: null,
                  message: null,
                  documentUrls: null,
                  nameCard: null,
                },
                isNull,
              ),
        ),
      ),
      pinnedMessages,
      total,
    };
  }

  async mappingFriendship(iterator: any, currentUser: User) {
    const friendship = await this.userService.findFriendship(
      currentUser.id,
      iterator.sender.id,
    );
    return {
      ...iterator,
      sender: omitBy(
        {
          ...iterator.sender,
          nickname: friendship?.nickname ?? '',
        },
        isNull,
      ),
    };
  }
}

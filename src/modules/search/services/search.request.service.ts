import { Inject, Injectable, Scope } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { FilterDto } from '../../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { UserRequestService } from '../../user/user.request.service';
import { GroupChatRequestService } from '../../group-chat/services/group-chat.request.service';
import { SearchDto } from '../dto/search.dto';
import { ESearchType } from '../dto/search.enum';
import { GetAllUserDto } from '../../user/dto/get-all-user.dto';
import { GetAllGroupChatDto } from '../../group-chat/dto/get-all-group-chat.dto';

@Injectable({ scope: Scope.REQUEST })
export class SearchService {
  constructor(
    @Inject(REQUEST) private request: Request,
    @Inject(GroupChatRequestService)
    private groupChatService: GroupChatRequestService,
    @Inject(UserRequestService) private userService: UserRequestService,
  ) {}

  async findAll(query: SearchDto) {
    let userRes = { items: [], total: 0 };
    let pagingLimit = 0;
    if (query.type === ESearchType.ALL) {
      pagingLimit = Math.round(query.limit / 2);
    }

    if (query.type !== ESearchType.GROUP_CHAT) {
      userRes = await this.userService.findAllUsers({
        ...query,
        limit: pagingLimit ? pagingLimit : query.limit,
        searchBy: ['username', 'friendship.nickname', 'phoneNumber', 'email'],
      } as unknown as GetAllUserDto);
    }

    let groupChatRes = { items: [], total: 0 };
    if (query.type !== ESearchType.USER) {
      groupChatRes = await this.groupChatService.findAll({
        ...query,
        limit: pagingLimit ? query.limit - pagingLimit : query.limit,
        searchBy: ['name'],
      } as unknown as GetAllGroupChatDto);
    }

    return {
      items: [...userRes.items, ...groupChatRes.items],
      total: userRes?.total + groupChatRes.total,
    };
  }
}

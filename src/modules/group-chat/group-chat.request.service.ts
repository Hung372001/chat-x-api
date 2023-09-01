import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { BaseService } from '../../common/services/base.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { GroupChat } from './entities/group-chat.entity';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { different } from 'lodash';
import { User } from '../user/entities/user.entity';
import { EGroupChatType } from './dto/group-chat.enum';
import { FilterDto } from '../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AppGateway } from '../gateway/app.gateway';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatRequestService extends BaseService<GroupChat> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
    @Inject(AppGateway) private readonly gateway: AppGateway,
  ) {
    super(groupChatRepo);
  }

  override async findAll(query: FilterDto) {
    const currentUser = this.request.user as User;
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

    const queryBuilder = this.groupChatRepo
      .createQueryBuilder('group_chat')
      .leftJoinAndSelect('group_chat.members', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('group_chat.latestMessage', 'chat_message')
      .where('user.id = :userId', { userId: currentUser.id });

    if (keyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`keyword_${index}`] = !Array.isArray(keyword)
            ? `%${keyword}%`
            : `%${keyword[index]}%`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `group_chat.${item}` : item
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
                  !item.includes('.') ? `group_chat.${item}` : item
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
              !item.includes('.') ? `group_chat.${item}` : item
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
                  !item.includes('.') ? `group_chat.${item}` : item
                } as text) ilike :andKeyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    const [items, total] = await queryBuilder
      .orderBy(`group_chat.${sortBy}`, sortOrder)
      .take(isGetAll ? null : limit)
      .skip(isGetAll ? null : (page - 1) * limit)
      .getManyAndCount();

    return {
      items,
      total,
    };
  }

  override async findById(id: string): Promise<GroupChat> {
    const currentUser = this.request.user as User;
    try {
      const groupChat = await this.groupChatRepo.findOne({
        where: { id },
        relations: ['members'],
      });

      if (
        !groupChat ||
        !groupChat.members.some((x) => x.id === currentUser.id)
      ) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  override async create(dto: CreateGroupChatDto): Promise<GroupChat> {
    try {
      if (dto.type === EGroupChatType.GROUP) {
        const existedGroupName = await this.groupChatRepo.findOneBy({
          name: dto.name,
        });

        if (existedGroupName) {
          throw { message: 'Tên nhóm đã tồn tại.' };
        }

        if (dto.members.length <= 2) {
          throw { message: 'Số thành viên không hợp lệ.' };
        }
      }

      if (dto.type === EGroupChatType.DOU) {
        if (dto.members.length !== 2) {
          throw { message: 'Số thành viên không hợp lệ.' };
        }
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
        relations: ['profile'],
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      const newGroupChat = {
        members: members,
        name: dto.name,
        type: dto.type,
      } as unknown as GroupChat;

      await this.groupChatRepo.save(newGroupChat);

      // Call socket to create group chat
      await this.gateway.createGroupChat(newGroupChat);

      return newGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addMember(id: string, dto: AddMemberDto) {
    try {
      const foundGroupChat = await this.groupChatRepo.findOneBy({ id });
      if (foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        members: [...foundGroupChat.members, ...members],
      });

      // Call socket to create group chat
      await this.gateway.addNewGroupMember(foundGroupChat, members);

      return res;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeMember(id: string, dto: RemoveMemberDto) {
    try {
      const foundGroupChat = await this.groupChatRepo.findOneBy({ id });
      if (foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      // After remove members list
      const aRMembers = different(foundGroupChat.members, members);

      return this.groupChatRepo.save({
        ...foundGroupChat,
        members: aRMembers,
      });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

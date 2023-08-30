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
import { Socket } from 'socket.io';
import { User } from '../user/entities/user.entity';
import { EGroupChatType } from './dto/group-chat.enum';
import { FilterDto } from '../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatService extends BaseService<GroupChat> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
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

  override async create(dto: CreateGroupChatDto): Promise<GroupChat> {
    try {
      if (dto.type === EGroupChatType.GROUP) {
        const existedGroupName = await this.groupChatRepo.findOneBy({
          name: dto.name,
        });

        if (existedGroupName) {
          throw { message: 'Group name has already existed.' };
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
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      return this.groupChatRepo.save({
        members: members,
        name: dto.name,
        type: dto.type,
      } as unknown as GroupChat);
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

      return this.groupChatRepo.save({
        ...foundGroupChat,
        members: [...foundGroupChat.members, ...members],
      });
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

  async getJoinedGroups(userId: string) {
    try {
      return this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.members', 'user', 'user.id = :userId', {
          userId,
        })
        .getMany();
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async emitOnlineGroupMember(client: Socket, member: User, joinGroup = true) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Join socket to all group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (joinGroup) {
            await client.join(group.name);
          }
          client.emit('member_online', {
            groupChat: group,
            member,
          });
        }),
      );
    }
  }

  async emitOfflineGroupMember(
    client: Socket,
    member: User,
    leaveGroup = true,
  ) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Leave all joined group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (leaveGroup) {
            await client.leave(group.name);
          }
          client.emit('member_offline', {
            groupChat: group,
            member: client.data?.user,
          });
        }),
      );
    }
  }
}

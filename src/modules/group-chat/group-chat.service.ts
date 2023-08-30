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
import { Brackets, FindOptionsWhere, In, Repository } from 'typeorm';
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

@Injectable()
export class GroupChatService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members'],
    });
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

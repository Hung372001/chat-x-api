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
}

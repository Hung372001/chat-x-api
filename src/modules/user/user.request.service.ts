import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service';
import { AddFriendsDto } from './dto/add-friends.dto';
import { Request } from 'express';
import { differenceBy } from 'lodash';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class UserRequestService extends BaseService<User> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(userRepository);
  }

  async findMe() {
    return this.request.user as User;
  }

  async addFriends(dto: AddFriendsDto) {
    try {
      const currentUser = this.request.user as User;

      if (dto.friends.includes(currentUser.id)) {
        throw { message: 'Không thể làm bạn với chính mình.' };
      }

      const friends = await this.userRepository.find({
        where: { id: In(dto.friends) },
      });
      if (friends.length > 0 && friends.length < dto.friends.length) {
        throw { message: 'Không tìm thấy bạn bè.' };
      }

      // Push friend into friend list
      const newFriends = differenceBy(currentUser.friends, friends, 'id');
      currentUser.friends.push(newFriends);

      // Save friend list
      await this.userRepository.save(currentUser);
      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

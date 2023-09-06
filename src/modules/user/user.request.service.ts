import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Brackets, In, Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service';
import { AddFriendsDto } from './dto/add-friends.dto';
import { Request } from 'express';
import { differenceBy } from 'lodash';
import { REQUEST } from '@nestjs/core';
import { FilterDto } from '../../common/dto/filter.dto';
import { GetAllUserDto } from './dto/get-all-user.dto';
import { FriendRequest } from './entities/friend-request.entity';
import { EFriendRequestStatus } from './dto/friend-request.enum';

@Injectable({ scope: Scope.REQUEST })
export class UserRequestService extends BaseService<User> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
  ) {
    super(userRepository);
  }

  async findAllUsers(query: GetAllUserDto) {
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
      onlyFriend = false,
    } = query;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.friends', 'user as friends')
      .andWhere('user.id <> :userId', { userId: currentUser.id });

    if (keyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`keyword_${index}`] = !Array.isArray(keyword)
            ? `%${keyword}%`
            : `%${keyword[index]}%`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `user.${item}` : item
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
                  !item.includes('.') ? `user.${item}` : item
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
              !item.includes('.') ? `user.${item}` : item
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
                  !item.includes('.') ? `user.${item}` : item
                } as text) ilike :andKeyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    if (onlyFriend) {
      queryBuilder.andWhere('user as friends.id = :userId', {
        userId: currentUser.id,
      });
    }

    const [items, total] = await queryBuilder
      .orderBy(`user.${sortBy}`, sortOrder)
      .take(isGetAll ? null : limit)
      .skip(isGetAll ? null : (page - 1) * limit)
      .getManyAndCount();

    return {
      items: items.map((item) => ({
        ...item,
        friends: [],
        isFriend: item.friends.some((x) => x.id === currentUser.id),
      })),
      total,
    };
  }

  async findMe() {
    return this.request.user as User;
  }

  async findOneWithFriends() {
    const currentUser = this.request.user as User;
    return this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['friends', 'friends.profile'],
    });
  }

  async addFriendRequests(dto: AddFriendsDto) {
    try {
      const currentUser = await this.findOneWithFriends();

      if (dto.friends.includes(currentUser.id)) {
        throw { message: 'Không thể kết bạn với chính mình.' };
      }

      const friends = await this.userRepository.find({
        where: { id: In(dto.friends) },
        relations: ['friends'],
      });
      if (friends.length > 0 && friends.length < dto.friends.length) {
        throw { message: 'Không tìm thấy bạn bè.' };
      }

      // Push friend into friend list
      const newFriends: User[] = differenceBy(
        friends,
        currentUser.friends,
        'id',
      );
      if (newFriends?.length > 0) {
        // Save friend requests
        await Promise.all(
          newFriends.map(async (friend) => {
            await this.friendRequestRepository.save({
              fromUser: currentUser,
              toUser: friend,
            });
          }),
        );
      }

      return newFriends;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateFriendRequest(
    friendId: string,
    status = EFriendRequestStatus.ACCEPTED,
  ) {
    try {
      const currentUser = this.request.user as User;

      const friend = await this.userRepository.findOne({
        where: { id: friendId },
        relations: ['friends'],
      });

      if (!friend) {
        throw { message: 'Không tìm thấy tài khoản kết bạn.' };
      }

      const friendRequest = await this.friendRequestRepository
        .createQueryBuilder('friend_request')
        .where('friend_request.fromUserId = :fromUserId', {
          fromUserId: currentUser.id,
        })
        .andWhere('friend_request.toUserId = :toUserId', {
          toUserId: friendId,
        })
        .andWhere('friend_request.status = :status', {
          status: EFriendRequestStatus.ACCEPTED,
        })
        .getOne();

      if (!friendRequest) {
        throw { message: 'Không tìm thấy lời mời kết bạn.' };
      }

      if (currentUser.friends.some((x) => x.id === friendId)) {
        throw { message: 'Tài khoản này đã là bạn bè.' };
      }

      await this.friendRequestRepository.update(friendRequest.id, { status });

      if (status === EFriendRequestStatus.ACCEPTED) {
        // Save friend list for current user
        currentUser.friends.push(friend);
        await this.userRepository.save(currentUser);

        // Save friend list for friends
        await this.userRepository.save({
          ...friend,
          friends: [...friend.friends, currentUser],
        });
      }

      return;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeFriend(friendId: string) {
    try {
      const currentUser = await this.findOneWithFriends();

      if (friendId === currentUser.id) {
        throw { message: 'Friend id không hợp lệ.' };
      }

      const friendUser = await this.userRepository.findOne({
        where: { id: friendId },
        relations: ['friends'],
      });

      if (!friendUser) {
        throw { message: 'Không tìm thấy tài khoản bạn bè.' };
      }

      if (
        !currentUser.friends.some((friend: User) => friend.id === friendUser.id)
      ) {
        throw {
          message: 'Tài khoản hiện tại không phải là bạn bè với tài khoản này.',
        };
      }

      // Save friend list for current user
      const cuRemovedFriends = differenceBy(
        currentUser.friends,
        [friendUser],
        'id',
      );
      currentUser.friends = cuRemovedFriends;
      await this.userRepository.save(currentUser);

      // Save friend list for friend user
      const fuRemovedFriends = differenceBy(
        friendUser.friends,
        [currentUser],
        'id',
      );
      await this.userRepository.save({
        ...friendUser,
        friends: fuRemovedFriends,
      });

      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

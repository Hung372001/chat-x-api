import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AddFriendsDto } from './dto/add-friends.dto';
import { Request } from 'express';
import { differenceBy, intersectionBy } from 'lodash';
import { REQUEST } from '@nestjs/core';
import { FriendRequest } from './entities/friend-request.entity';
import { EFriendRequestStatus } from './dto/friend-request.enum';
import { AppGateway } from '../gateway/app.gateway';
import { User } from '../user/entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class FriendRequestService {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @Inject(AppGateway) private readonly gateway: AppGateway,
  ) {}

  async findOneWithFriends() {
    const currentUser = this.request.user as User;
    return this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: ['friends', 'friends.profile', 'profile'],
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

      const existedMembers = intersectionBy(currentUser.friends, friends, 'id');

      if (existedMembers.length > 0) {
        throw {
          message: `${existedMembers
            .map((x) => x.username)
            .join(', ')} đã là bạn bè của bạn.`,
        };
      }

      // Push friend into friend list
      const newFriends: User[] = differenceBy(
        friends,
        currentUser.friends,
        'id',
      );

      // Check existed request from that users
      const existedFriendRequests = await this.friendRequestRepository
        .createQueryBuilder('friend_request')
        .where('friend_request.status = :status', {
          status: EFriendRequestStatus.WAITING,
        })
        .leftJoinAndSelect('friend_request.fromUser', 'user')
        .andWhere('friend_request.fromUserId In (:...fromUserIds)', {
          fromUserIds: newFriends.map((x) => x.id),
        })
        .andWhere('friend_request.toUserId = :toUserId', {
          toUserId: currentUser.id,
        })
        .getMany();

      if (existedFriendRequests.length > 0) {
        throw {
          message: `${existedFriendRequests
            .map((x) => x.fromUser.username)
            .join(', ')} đã gửi lời mời kết bạn với bạn, vui lòng chấp nhận.`,
        };
      }

      if (newFriends?.length > 0) {
        // Save friend requests
        await Promise.all(
          newFriends.map(async (friend) => {
            await this.friendRequestRepository.save({
              fromUser: currentUser,
              toUser: friend,
            });

            // Call socket to create group chat dou for new friend
            await this.gateway.createNewFriendGroup(friend, currentUser);
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
      const currentUser = await this.findOneWithFriends();

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
          fromUserId: friendId,
        })
        .andWhere('friend_request.toUserId = :toUserId', {
          toUserId: currentUser.id,
        })
        .andWhere('friend_request.status = :status', {
          status: EFriendRequestStatus.WAITING,
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

  async getFriendRequest(userId: string) {
    try {
      const currentUser = this.request.user as User;

      return this.friendRequestRepository
        .createQueryBuilder('friend_request')
        .where('friend_request.status = :status', {
          status: EFriendRequestStatus.WAITING,
        })
        .andWhere('friend_request.fromUserId = :fromUserId', {
          fromUserId: userId,
        })
        .andWhere('friend_request.toUserId = :toUserId', {
          toUserId: currentUser.id,
        })
        .getOne();
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

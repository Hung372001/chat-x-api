import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { AddFriendsDto } from './dto/add-friends.dto';
import { Request } from 'express';
import { differenceBy, intersectionBy } from 'lodash';
import { REQUEST } from '@nestjs/core';
import { FriendRequest } from './entities/friend-request.entity';
import { EFriendRequestStatus } from './dto/friend-request.enum';
import { AppGateway } from '../gateway/app.gateway';
import { User } from '../user/entities/user.entity';
import { UpdateNicknameDto } from './dto/update-nickname.dto';
import { Friendship } from './entities/friendship.entity';
import { CacheService } from '../cache/cache.service';

@Injectable({ scope: Scope.REQUEST })
export class FriendRequestService {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @Inject(AppGateway) private readonly gateway: AppGateway,
    @Inject(CacheService) private cacheService: CacheService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async findOneWithFriends() {
    const currentUser = this.request.user as User;
    return this.userRepository.findOne({
      where: { id: currentUser.id },
      relations: [
        'friends',
        'friends.toUser.profile',
        'friends.fromUser.profile',
        'profile',
      ],
    });
  }

  async findFriendship(fromUserId: string, toUserId: string) {
    const cacheKey = `Friendship_${fromUserId}_${toUserId}`;
    let cacheData = await this.cacheService.get(cacheKey);

    if (!cacheData) {
      cacheData = await this.friendshipRepository
        .createQueryBuilder('friendship')
        .where('friendship.fromUserId = :fromUserId', { fromUserId })
        .andWhere('friendship.toUserId = :toUserId', { toUserId })
        .getOne();

      await this.cacheService.set(cacheKey, cacheData);
    }

    return cacheData;
  }

  async updateFriendNickname(friendId: string, dto: UpdateNicknameDto) {
    try {
      const currentUser = this.request.user as User;

      if (currentUser.id === friendId) {
        throw { message: 'Không được tự đặt biệt danh cho chính mình' };
      }

      const friendship = await this.findFriendship(currentUser.id, friendId);
      if (!friendship) {
        throw { message: 'Bạn chưa là bạn bè với người dùng này.' };
      }

      if (friendship.nickname !== dto.nickname) {
        friendship.nickname = dto.nickname;
        await this.friendshipRepository.update(friendship.id, {
          nickname: friendship.nickname,
        });

        await this.cacheService.del(`Friendship_${currentUser.id}_${friendId}`);

        const groupChats = await this.connection.query(`
        select "group_chat"."id"
        from "group_chat"
        left join "group_chat_members_user"
        on "group_chat_members_user"."groupChatId" = "group_chat"."id"
        where "group_chat_members_user"."userId" = '${currentUser.id}'
      `);

        if (groupChats?.length) {
          await Promise.all(
            groupChats.map(async (group) => {
              await this.cacheService.del(
                `PinnedMessage_${JSON.stringify(group.id)}`,
              );
            }),
          );
        }
      }

      return friendship;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addFriendRequests(dto: AddFriendsDto) {
    try {
      const currentUser = await this.findOneWithFriends();

      if (dto.friends.includes(currentUser.id)) {
        throw { message: 'Không thể kết bạn với chính mình.' };
      }

      const friends = await this.userRepository.find({
        where: { id: In(dto.friends) },
        relations: ['friends', 'friends.toUser', 'friends.fromUser'],
      });
      if (friends.length > 0 && friends.length < dto.friends.length) {
        throw { message: 'Không tìm thấy bạn bè.' };
      }

      if (currentUser.friends?.length) {
        const existedMembers = intersectionBy(
          currentUser.friends.map((x) => x.fromUser),
          friends,
          'id',
        );

        if (existedMembers.length > 0) {
          throw {
            message: `${existedMembers
              .map((x) => x.username)
              .join(', ')} đã là bạn bè của bạn.`,
          };
        }
      }

      // Push friend into friend list
      const newFriends: User[] = differenceBy(
        friends,
        currentUser.friends,
        'id',
      );

      // Check existed request from that users
      const queryBuilder = this.friendRequestRepository
        .createQueryBuilder('friend_request')
        .where('friend_request.status = :status', {
          status: EFriendRequestStatus.WAITING,
        })
        .leftJoinAndSelect('friend_request.fromUser', 'user');

      if (newFriends?.length) {
        queryBuilder.andWhere(
          'friend_request.fromUserId In (:...fromUserIds)',
          {
            fromUserIds: newFriends.map((x) => x.id),
          },
        );
      }

      let existedFriendRequests = await queryBuilder
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

      // Check existed friend requests
      const frQueryBuilder = this.friendRequestRepository
        .createQueryBuilder('friend_request')
        .where('friend_request.status = :status', {
          status: EFriendRequestStatus.WAITING,
        })
        .leftJoinAndSelect('friend_request.toUser', 'user');

      if (newFriends?.length) {
        frQueryBuilder.andWhere('friend_request.toUserId In (:...toUserIds)', {
          toUserIds: newFriends.map((x) => x.id),
        });
      }

      existedFriendRequests = await frQueryBuilder
        .andWhere('friend_request.fromUserId = :fromUserId', {
          fromUserId: currentUser.id,
        })
        .getMany();

      if (existedFriendRequests.length > 0) {
        throw {
          message: `Bạn đã gửi lời mời kết bạn với ${existedFriendRequests
            .map((x) => x.toUser.username)
            .join(', ')}, vui lòng chờ.`,
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

      friendRequest.status = status;
      await this.friendRequestRepository.update(friendRequest.id, {
        status: friendRequest.status,
      });

      if (status === EFriendRequestStatus.ACCEPTED) {
        const friendship = [];
        // Save friend list for current user
        friendship.push(
          this.friendshipRepository.create({
            fromUser: currentUser,
            toUser: friend,
            nickname: '',
          } as unknown as Friendship),
        );

        // Save friend list for friends
        friendship.push(
          this.friendshipRepository.create({
            toUser: currentUser,
            fromUser: friend,
            nickname: '',
          } as unknown as Friendship),
        );

        await this.friendshipRepository.save(friendship);

        // emit socket event accept friend request
        await this.gateway.acceptFriendRequest(friend, currentUser);
      }

      return friendRequest;
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
        relations: ['friends', 'friends.toUser', 'friends.fromUser'],
      });

      if (!friendUser) {
        throw { message: 'Không tìm thấy tài khoản bạn bè.' };
      }

      const friendships = [
        ...currentUser.friends,
        ...friendUser.friends,
      ].filter(
        (friend: Friendship) =>
          (friend?.toUser?.id === friendUser?.id &&
            friend?.fromUser?.id === currentUser?.id) ||
          (friend?.fromUser?.id === friendUser?.id &&
            friend?.toUser?.id === currentUser?.id),
      );
      if (!friendships?.length) {
        throw {
          message: 'Tài khoản hiện tại không phải là bạn bè với tài khoản này.',
        };
      }

      // Save friend list for friend user
      await this.friendshipRepository.delete(friendships.map((x) => x.id));

      const cuRemovedFriends = differenceBy(
        currentUser.friends,
        [...friendships],
        'id',
      );
      currentUser.friends = cuRemovedFriends;

      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getFriendRequest(userId: string) {
    try {
      const currentUser = this.request.user as User;

      if (userId === currentUser.id) {
        throw { message: 'Friend id không hợp lệ.' };
      }

      const friendRequest = await this.friendRequestRepository
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

      let isFriend = false;
      if (!friendRequest) {
        const currentUser = await this.findOneWithFriends();

        const friendUser = await this.userRepository.findOne({
          where: { id: userId },
          relations: ['friends', 'friends.toUser', 'friends.fromUser'],
        });

        if (!friendUser) {
          throw { message: 'Không tìm thấy bạn bè.' };
        }

        if (currentUser.friends?.length && friendUser.friends?.length) {
          const friendships = [
            ...currentUser.friends,
            ...friendUser.friends,
          ].filter(
            (friend: Friendship) =>
              (friend?.toUser?.id === friendUser?.id &&
                friend?.fromUser?.id === currentUser?.id) ||
              (friend?.fromUser?.id === friendUser?.id &&
                friend?.toUser?.id === currentUser?.id),
          );
          isFriend = !!friendships?.length;
        }
      }

      return {
        isFriend,
        friendRequest,
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

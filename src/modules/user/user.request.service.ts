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
import { differenceBy, intersectionBy } from 'lodash';
import { REQUEST } from '@nestjs/core';
import { GetAllUserDto } from './dto/get-all-user.dto';
import { FriendRequest } from './entities/friend-request.entity';
import { EFriendRequestStatus } from './dto/friend-request.enum';
import { RollCall } from './entities/roll-call.entity';
import moment from 'moment';
import { GetAllRollCallDto } from './dto/get-all-roll-calls.dto';
import { ConfigService } from '@nestjs/config';
import { Profile } from '../profile/entities/profile.entity';
import { CreateRollCallDto } from './dto/create-roll-calls.dto';
import { ERole } from '../../common/enums/role.enum';
import { AppGateway } from '../gateway/app.gateway';

@Injectable({ scope: Scope.REQUEST })
export class UserRequestService extends BaseService<User> {
  constructor(
    @Inject(REQUEST) private request: Request,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FriendRequest)
    private friendRequestRepository: Repository<FriendRequest>,
    @InjectRepository(RollCall)
    private rollCallRepository: Repository<RollCall>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {
    super(userRepository);
  }

  async findAllUsers(query: GetAllUserDto) {
    const currentUser = this.request.user as User;
    const isRootAdmin = currentUser.roles[0].type === ERole.ADMIN;

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

    if (!isRootAdmin && !keyword && !andKeyword && !onlyFriend) {
      return {
        items: [],
        total: 0,
      };
    }

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.friends', 'user as friends')
      .andWhere('user.id <> :userId', { userId: currentUser.id });

    if (!isRootAdmin) {
      queryBuilder.andWhere('user.hiding = false');
    }

    if (keyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          if (isRootAdmin || onlyFriend) {
            whereParams[`keyword_${index}`] = !Array.isArray(keyword)
              ? `%${keyword}%`
              : `%${keyword[index]}%`;
          } else {
            whereParams[`keyword_${index}`] = !Array.isArray(keyword)
              ? `${keyword}`
              : `${keyword[index]}`;
          }

          queryBuilder.andWhere(
            isRootAdmin || onlyFriend
              ? `cast(${
                  !item.includes('.') ? `user.${item}` : item
                } as text) ilike :keyword_${index} `
              : `${
                  !item.includes('.') ? `user.${item}` : item
                } = :keyword_${index}`,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              if (isRootAdmin || onlyFriend) {
                whereParams[`keyword_${index}`] = !Array.isArray(keyword)
                  ? `%${keyword}%`
                  : `%${keyword[index]}%`;
              } else {
                whereParams[`keyword_${index}`] = !Array.isArray(keyword)
                  ? `${keyword}`
                  : `${keyword[index]}`;
              }

              subQuery.orWhere(
                isRootAdmin || onlyFriend
                  ? `cast(${
                      !item.includes('.') ? `user.${item}` : item
                    } as text) ilike :keyword_${index} `
                  : `${
                      !item.includes('.') ? `user.${item}` : item
                    } = :keyword_${index} `,
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
          if (isRootAdmin || onlyFriend) {
            whereParams[`andKeyword_${index}`] = !Array.isArray(keyword)
              ? `%${keyword}%`
              : `%${keyword[index]}%`;
          } else {
            whereParams[`andKeyword_${index}`] = !Array.isArray(keyword)
              ? `${keyword}`
              : `${keyword[index]}`;
          }

          queryBuilder.andWhere(
            isRootAdmin || onlyFriend
              ? `cast(${
                  !item.includes('.') ? `user.${item}` : item
                } as text) ilike :andKeyword_${index} `
              : `${
                  !item.includes('.') ? `user.${item}` : item
                } = :andKeyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              if (isRootAdmin || onlyFriend) {
                whereParams[`andKeyword_${index}`] = !Array.isArray(keyword)
                  ? `%${keyword}%`
                  : `%${keyword[index]}%`;
              } else {
                whereParams[`andKeyword_${index}`] = !Array.isArray(keyword)
                  ? `${keyword}`
                  : `${keyword[index]}`;
              }

              subQuery.orWhere(
                isRootAdmin || onlyFriend
                  ? `cast(${
                      !item.includes('.') ? `user.${item}` : item
                    } as text) ilike :andKeyword_${index} `
                  : `${
                      !item.includes('.') ? `user.${item}` : item
                    } = :andKeyword_${index} `,
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

  async findAllRoleCalls(query: GetAllRollCallDto) {
    const currentUser = this.request.user as User;
    const { fromDate, toDate, sortBy, sortOrder } = query;

    const queryBuilder = await this.rollCallRepository
      .createQueryBuilder('roll_call')
      .leftJoin('roll_call.user', 'user')
      .where('user.id = :userId', { userId: currentUser.id });

    if (fromDate) {
      queryBuilder.andWhere('roll_call.checkedDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('roll_call.checkedDate <= :toDate', { toDate });
    }

    const [items, total] = await queryBuilder
      .orderBy(`roll_call.${sortBy}`, sortOrder)
      .getManyAndCount();

    return {
      items: items.map((x) => x.checkedDate),
      total,
    };
  }

  async makeRollCall() {
    try {
      const currentUser = this.request.user as User;
      const fromDate = moment().startOf('date').utc().toDate();
      const toDate = moment().endOf('date').utc().toDate();

      const existedRollCall = await this.rollCallRepository
        .createQueryBuilder('roll_call')
        .leftJoin('roll_call.user', 'user')
        .where('roll_call.checkedDate >= :fromDate', { fromDate })
        .andWhere('roll_call.checkedDate <= :toDate', { toDate })
        .andWhere('user.id = :userId', { userId: currentUser.id })
        .getOne();

      if (existedRollCall) {
        throw { message: 'Hôm nay bạn đã điểm danh.' };
      }

      currentUser.profile.activityScore =
        +currentUser.profile.activityScore +
        this.configService.get('ACTIVITY_SCORE_PER_ROLL_CALL');

      await this.profileRepository.update(currentUser.profile.id, {
        activityScore: currentUser.profile.activityScore,
      });

      const newRollCall = this.rollCallRepository.create({
        user: currentUser,
      });
      return this.rollCallRepository.save(newRollCall);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async createRollCall(dto: CreateRollCallDto) {
    try {
      const currentUser = this.request.user as User;
      const fromDate = moment(dto.checkedDate).startOf('date').utc().toDate();
      const toDate = moment(dto.checkedDate).endOf('date').utc().toDate();

      const existedRollCall = await this.rollCallRepository
        .createQueryBuilder('roll_call')
        .leftJoin('roll_call.user', 'user')
        .where('roll_call.checkedDate >= :fromDate', { fromDate })
        .andWhere('roll_call.checkedDate <= :toDate', { toDate })
        .andWhere('user.id = :userId', { userId: currentUser.id })
        .getOne();

      if (existedRollCall) {
        throw { message: 'Bạn đã điểm danh vào ngày này.' };
      }

      currentUser.profile.activityScore =
        +currentUser.profile.activityScore +
        this.configService.get('ACTIVITY_SCORE_PER_ROLL_CALL');

      await this.profileRepository.update(currentUser.profile.id, {
        activityScore: currentUser.profile.activityScore,
      });

      const newRollCall = this.rollCallRepository.create({
        user: currentUser,
        checkedDate: dto.checkedDate,
      });
      return this.rollCallRepository.save(newRollCall);
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

  async hiding() {
    try {
      const currentUser = this.request.user as User;

      currentUser.hiding = !currentUser.hiding;

      await this.userRepository.update(currentUser.id, {
        hiding: currentUser.hiding,
      });
      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async soundNotification() {
    try {
      const currentUser = this.request.user as User;

      currentUser.soundNotification = !currentUser.soundNotification;

      await this.userRepository.update(currentUser.id, {
        soundNotification: currentUser.soundNotification,
      });
      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

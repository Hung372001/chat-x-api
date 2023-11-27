import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { BaseService } from '../../common/services/base.service';
import { UpdateProfileDto } from './dto/update.dto';
import { User } from '../user/entities/user.entity';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { CacheService } from '../cache/cache.service';

@Injectable({ scope: Scope.REQUEST })
export class ProfileService extends BaseService<Profile> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cacheService: CacheService,
  ) {
    super(profileRepository);
  }

  async updateProfile(dto: UpdateProfileDto) {
    try {
      const currentUser = this.request.user as User;

      // Clear cache
      await this.cacheService.del(
        `User_${currentUser.email}_${currentUser.phoneNumber}`,
      );
      await this.cacheService.del(`User_${currentUser.email}_undefined`);
      await this.cacheService.del(`User_undefined_${currentUser.phoneNumber}`);
      await this.cacheService.del(`User_${currentUser.id}`);

      if (currentUser.username !== dto.username) {
        const existedUsername = await this.userRepository.findOne({
          where: {
            id: Not(currentUser.id),
            username: dto.username,
          },
        });

        if (existedUsername) {
          throw { message: 'Tên người dùng này đã tồn tại.' };
        }

        this.userRepository.update(currentUser.id, { username: dto.username });
      }

      if (currentUser.phoneNumber !== dto.phoneNumber) {
        const existedPhoneNumber = await this.userRepository.findOne({
          where: {
            id: Not(currentUser.id),
            phoneNumber: dto.phoneNumber,
          },
        });

        if (existedPhoneNumber) {
          throw { message: 'Số điện thoại này đã tồn tại.' };
        }

        currentUser.phoneNumber = dto.phoneNumber;
        this.userRepository.update(currentUser.id, {
          phoneNumber: dto.phoneNumber,
        });
      }

      if (currentUser.profile.gender !== dto.gender) {
        currentUser.profile.gender = dto.gender;
        this.profileRepository.update(currentUser.profile.id, {
          gender: currentUser.profile.gender,
        });
      }

      return currentUser;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async updateAvatar(dto: UpdateAvatarDto) {
    const currentUser = this.request.user as User;
    currentUser.profile.avatar = dto.avatar;
    await this.profileRepository.update(currentUser.profile.id, {
      avatar: currentUser.profile.avatar,
    });

    // Clear cache
    await this.cacheService.del(
      `User_${currentUser.email}_${currentUser.phoneNumber}`,
    );
    await this.cacheService.del(`User_${currentUser.email}_undefined`);
    await this.cacheService.del(`User_undefined_${currentUser.phoneNumber}`);
    await this.cacheService.del(`User_${currentUser.id}`);

    return currentUser;
  }
}

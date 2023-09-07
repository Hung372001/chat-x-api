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
import { UpdateNicknameDto } from '../group-chat/dto/update-nickname.dto';

@Injectable({ scope: Scope.REQUEST })
export class ProfileService extends BaseService<Profile> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super(profileRepository);
  }

  updateProfile(dto: UpdateProfileDto) {
    try {
      const currentUser = this.request.user as User;

      if (currentUser.username !== dto.username) {
        const existedUsername = this.userRepository.findOne({
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
        const existedPhoneNumber = this.userRepository.findOne({
          where: {
            id: Not(currentUser.id),
            phoneNumber: dto.phoneNumber,
          },
        });

        if (existedPhoneNumber) {
          throw { message: 'Số điện thoại này đã tồn tại.' };
        }

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

  updateAvatar(dto: UpdateAvatarDto) {
    const currentUser = this.request.user as User;
    currentUser.profile.avatar = dto.avatar;
    this.profileRepository.update(currentUser.profile.id, {
      avatar: currentUser.profile.avatar,
    });
    return currentUser;
  }
}

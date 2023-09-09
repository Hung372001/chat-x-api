import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { FCMToken } from './entities/fcm-token.entity';
import { CreateFCMTokenDto } from './dto/create-fcm-token.dto';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class FCMTokenRequestService extends BaseService<FCMToken> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
  ) {
    super(fcmTokenRepository);
  }

  async create(dto: CreateFCMTokenDto) {
    try {
      const currentUser = this.request.user as User;

      const foundToken = await this.fcmTokenRepository
        .createQueryBuilder('fcm_token')
        .leftJoinAndSelect('fcm_token.user', 'user')
        .where('fcm_token."deviceToken" = :deviceToken', {
          deviceToken: dto.deviceToken,
        })
        .andWhere('user.id = :userId', { userId: currentUser.id })
        .getOne();

      if (foundToken) {
        throw { message: 'Device token đã tồn tại.' };
      }

      return this.fcmTokenRepository.save({ ...dto, user: currentUser });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  override async remove(id: string): Promise<DeleteResult> {
    const currentUser = this.request.user as User;

    const foundToken = await this.fcmTokenRepository
      .createQueryBuilder('fcm_token')
      .leftJoinAndSelect('fcm_token.user', 'user')
      .where('fcm_token.id = :tokenId', {
        tokenId: id,
      })
      .andWhere('user.id = :userId', { userId: currentUser.id })
      .getOne();

    if (!foundToken) {
      throw new BadRequestException('Device token đã tồn tại.');
    }

    return await this.fcmTokenRepository.softDelete(id);
  }
}

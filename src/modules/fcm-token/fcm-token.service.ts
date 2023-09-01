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

@Injectable()
export class FCMTokenService extends BaseService<FCMToken> {
  constructor(
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
  ) {
    super(fcmTokenRepository);
  }

  async findByUser(userId: string): Promise<FCMToken[]> {
    return this.fcmTokenRepository
      .createQueryBuilder('fcm_token')
      .leftJoinAndSelect('fcm_token.user', 'user')
      .andWhere('user.id = :userId', { userId })
      .getMany();
  }
}

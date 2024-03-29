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
import { ClientProxy } from '@nestjs/microservices';
import { RemoveFCMTokenDto } from './dto/remove-fcm-token.dto';
import { ERmqQueueName } from '../../common/enums/rmq.enum';

@Injectable({ scope: Scope.REQUEST })
export class FCMTokenRequestService extends BaseService<FCMToken> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
    @Inject(ERmqQueueName.NOTIFICATION) private rmqClient: ClientProxy,
  ) {
    super(fcmTokenRepository);
  }

  async create(dto: CreateFCMTokenDto) {
    try {
      const currentUser = this.request.user as User;

      // Emit job to queue (avoid duplicate create notification token request)
      await this.rmqClient.emit('addFCMToken', {
        user: currentUser,
        createTokenDto: dto,
      });

      return { ...dto, user: currentUser } as FCMToken;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  override async remove(id: string): Promise<DeleteResult> {
    const foundToken = await this.fcmTokenRepository
      .createQueryBuilder('fcm_token')
      .leftJoinAndSelect('fcm_token.user', 'user')
      .where('fcm_token.id = :tokenId', {
        tokenId: id,
      })
      .getOne();

    if (!foundToken) {
      throw new BadRequestException('Không tìm thấy device token.');
    }

    return this.fcmTokenRepository.delete(id);
  }

  async removeByToken(dto: RemoveFCMTokenDto): Promise<DeleteResult> {
    const foundToken = await this.fcmTokenRepository
      .createQueryBuilder('fcm_token')
      .leftJoinAndSelect('fcm_token.user', 'user')
      .where('fcm_token.deviceToken = :deviceToken', {
        deviceToken: dto.deviceToken,
      })
      .getOne();

    if (!foundToken) {
      throw new BadRequestException('Không tìm thấy device token.');
    }

    return this.fcmTokenRepository.delete(foundToken.id);
  }
}

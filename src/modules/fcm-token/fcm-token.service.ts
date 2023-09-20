import { Injectable } from '@nestjs/common';
import { FCMToken } from './entities/fcm-token.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  async clearToken(deviceToken: string) {
    const tokens = await this.fcmTokenRepository.findBy({ deviceToken });
    if (tokens.length) {
      return Promise.all(
        tokens.map((token) => this.fcmTokenRepository.delete(token.id)),
      );
    }

    return null;
  }
}

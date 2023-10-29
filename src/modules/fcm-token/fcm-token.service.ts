import { Injectable, Logger } from '@nestjs/common';
import { FCMToken } from './entities/fcm-token.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFCMTokenDto } from './dto/create-fcm-token.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class FCMTokenService extends BaseService<FCMToken> {
  private logger = new Logger(FCMTokenService.name);
  constructor(
    @InjectRepository(FCMToken)
    private readonly fcmTokenRepository: Repository<FCMToken>,
  ) {
    super(fcmTokenRepository);
  }

  async addFCMToken(currentUser: User, dto: CreateFCMTokenDto) {
    try {
      const foundToken = await this.fcmTokenRepository
        .createQueryBuilder('fcm_token')
        .leftJoinAndSelect('fcm_token.user', 'user')
        .where('fcm_token."deviceToken" = :deviceToken', {
          deviceToken: dto.deviceToken,
        })
        .andWhere('user.id = :userId', { userId: currentUser.id })
        .getOne();

      if (foundToken) {
        return foundToken;
      }

      const newToken = await this.fcmTokenRepository.create({
        ...dto,
        user: currentUser,
      } as FCMToken);
      await this.fcmTokenRepository.save(newToken);
    } catch (e: any) {
      this.logger.error(e.message);
    }
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

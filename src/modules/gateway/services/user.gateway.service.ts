import { Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Friendship } from '../../friend/entities/friendship.entity';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class UserGatewayService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
    @Inject(CacheService) private cacheService: CacheService,
  ) {
    super(userRepository);
  }

  async findOne(
    query: FindOptionsWhere<User> | FindOptionsWhere<User>[],
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: query,
      relations: ['roles', 'profile'],
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
}

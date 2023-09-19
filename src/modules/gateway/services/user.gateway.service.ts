import { Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Friendship } from '../../friend/entities/friendship.entity';

@Injectable()
export class UserGatewayService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private friendshipRepository: Repository<Friendship>,
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
    return this.friendshipRepository
      .createQueryBuilder('friendship')
      .where('friendship.fromUserId = :fromUserId', { fromUserId })
      .andWhere('friendship.toUserId = :toUserId', { toUserId })
      .getOne();
  }
}

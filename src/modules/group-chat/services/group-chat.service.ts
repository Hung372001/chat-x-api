import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { UserService } from '../../user/user.service';
import { GroupChat } from '../entities/group-chat.entity';
import { EGroupChatType } from '../dto/group-chat.enum';

@Injectable()
export class GroupChatService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members'],
    });
  }

  async getGroupChatDou(memberIds: string[]) {
    const groupChat = await this.groupChatRepo
      .createQueryBuilder('group_chat')
      .select('group_chat.id')
      .leftJoin('group_chat.members', 'user')
      .where('group_chat.type = :type', { type: EGroupChatType.DOU })
      .addGroupBy('group_chat.id')
      .having(`array_agg(user.id) @> :userIds::uuid[]`, {
        userIds: memberIds,
      })
      .getOne();

    if (!groupChat) {
      throw new HttpException(
        'Không tìm thấy cuộc hội thoại',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.findOne({ id: groupChat.id });
  }
}

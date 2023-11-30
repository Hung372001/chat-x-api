import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, FindOptionsWhere, Repository } from 'typeorm';
import { UserService } from '../../user/user.service';
import { GroupChat } from '../entities/group-chat.entity';
import { EGroupChatType } from '../dto/group-chat.enum';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class GroupChatService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(CacheService) private readonly cacheService: CacheService,
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
    });
  }

  async findOneWithMemberIds(groupId: string) {
    try {
      const cacheKey = `GroupChat_${groupId}`;
      let groupChat = await this.cacheService.get(cacheKey);

      if (!groupChat) {
        groupChat = await this.groupChatRepo.findOne({
          where: { id: groupId },
        });

        if (!groupChat) {
          throw { message: 'Không tìm thấy nhóm chat.' };
        }

        groupChat.members = await this.connection.query(
          `
          SELECT "userId" as "id"
          FROM "group_chat_members_user"
          LEFT JOIN "user" ON "group_chat_members_user"."userId" = "user"."id"
          WHERE "groupChatId" = '${groupChat.id}' and "user"."deleted_at" IS NULL;
        `,
        );

        await this.cacheService.set(cacheKey, groupChat);
      }

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
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

  async isGroupAdmin(groupId: string, userId: string) {
    const isAdmin = await this.connection.query(`
      SELECT COUNT("userId")
      FROM "group_chat_admins_user"
      WHERE "groupChatId" = '${groupId}' and "userId" = '${userId}'
    `);

    return isAdmin.length ? isAdmin[0]?.count === '1' : false;
  }

  async isGroupMember(groupId: string, userId: string) {
    const isMember = await this.connection.query(`
      SELECT COUNT("userId")
      FROM "group_chat_members_user"
      WHERE "groupChatId" = '${groupId}' and "userId" = '${userId}'
    `);

    return isMember.length ? isMember[0]?.count === '1' : false;
  }

  async getGroupOwner(groupChatId: string) {
    try {
      const cacheKey = `GroupChatOwner_${groupChatId}`;
      const cacheData = await this.cacheService.get(cacheKey);

      if (cacheData) {
        return cacheData;
      }

      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.owner', 'user')
        .select(['group_chat.id', 'user.id'])
        .where('group_chat.id = :groupChatId', { groupChatId })
        .getOne();

      await this.cacheService.set(cacheKey, groupChat.owner);

      return groupChat.owner;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getGroupAdmins(groupChatId: string) {
    try {
      const cacheKey = `GroupChatAdmins_${groupChatId}`;
      const cacheData = await this.cacheService.get(cacheKey);

      if (cacheData) {
        return cacheData;
      }

      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoin('group_chat.admins', 'user')
        .select([
          'group_chat.id',
          'user.id',
          'user.createdAt',
          'user.email',
          'user.phoneNumber',
          'user.username',
        ])
        .where('group_chat.id = :groupChatId', { groupChatId })
        .getOne();

      await this.cacheService.set(cacheKey, groupChat.admins);

      return groupChat.admins;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

import { Controller, Inject, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '../../rmq/rmq.service';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { CacheService } from '../../cache/cache.service';

@Controller()
export class FriendConsumer {
  private readonly logger = new Logger(FriendConsumer.name);
  cacheMessageParallel = +process.env.CAHE_MESSAGE_PARALLEL ?? 10;

  constructor(
    private rmqService: RmqService,
    @InjectConnection() private readonly connection: Connection,
    @Inject(CacheService) private cacheService: CacheService,
  ) {}

  @EventPattern('clearFriendCache')
  async clearFriendCache(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.debug('Start job update unRead settings');

    try {
      await this.cacheService.del(
        `Friendship_${data.currentUser.id}_${data.friendId}`,
      );

      const groupChats = await this.connection.query(`
          select "group_chat"."id"
          from "group_chat"
          left join "group_chat_members_user"
          on "group_chat_members_user"."groupChatId" = "group_chat"."id"
          where "group_chat_members_user"."userId" = '${data.currentUser.id}'
        `);

      if (groupChats?.length) {
        await Promise.all(
          groupChats.map(async (group) => {
            await this.cacheService.del(
              `PinnedMessage_${JSON.stringify(group.id)}`,
            );
            await this.cacheService.delByPattern(`GroupMember_${group.id}_`);
          }),
        );
      }
    } catch (e: any) {
      this.logger.debug(e);
    }

    this.logger.debug('Update unRead settings completed');
    this.rmqService.ack(context);
  }
}

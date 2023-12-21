import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { CacheService } from '../cache/cache.service';
import { uniqBy } from 'lodash';

const remainNumbers = +process.env.REMAIN_CHAT_MESSAGE_NUMBER ?? 250;
@Injectable()
export class ChatMessageScheduler {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(CacheService) private cacheService: CacheService,
  ) {}

  @Cron('0 0 18 * * *', { utcOffset: 0 })
  async clearChatHistory() {
    console.log(
      `[${moment
        .utc()
        .format(
          'dd - DD/MM/YYYY HH:mm:ss',
        )}] - [Job][Begin] - Save temp chat message`,
    );
    try {
      const groupChatIds = await this.connection.query(`
          select "groupId"
          from "chat_message"
          where "chat_message"."id" not in (select distinct "latestMessageId" from "group_chat")
          or "chat_message"."pinned" != true
          group by "groupId"
          having count("chat_message"."id") > ${remainNumbers}
      `);

      if (groupChatIds?.length) {
        await Promise.all(
          groupChatIds.map(async (group) => {
            const chatMessages = await this.connection.query(`
            insert into "all_chat_message" ("id", "is_active", "created_at", "updated_at", "deleted_at", "message", "imageUrls", "documentUrls", "isRead", "unsent", "pinned", "senderId", "groupId", "deletedById", "unsentById", "pinnedById", "nameCardId", "isFriendRequest") 
            select "id", "is_active", "created_at", "updated_at", "deleted_at", "message", "imageUrls", "documentUrls", "isRead", "unsent", "pinned", "senderId", "groupId", "deletedById", "unsentById", "pinnedById", "nameCardId", "isFriendRequest"
            from "chat_message"
            where ("chat_message"."id" not in (select distinct "latestMessageId" from "group_chat")
            or "chat_message"."pinned" != true)
            and "groupId" = '${group.groupId}'
            order by "created_at" DESC
            offset ${remainNumbers}
            returning "id";
        `);

            if (chatMessages?.length) {
              await this.chatMessageRepo.delete(chatMessages.map((x) => x.id));
            }
          }),
        );
      }
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    } finally {
      console.log(
        `[${moment
          .utc()
          .format(
            'dd - DD/MM/YYYY HH:mm:ss',
          )}] - [Job][End] - Save temp chat message`,
      );
    }
  }

  @Cron('0 30 */3 * * *', { utcOffset: 0 })
  async saveChatMessage() {
    console.log(
      `[${moment
        .utc()
        .format(
          'dd - DD/MM/YYYY HH:mm:ss',
        )}] - [Job][Begin] - Save cache messages`,
    );
    try {
      const allMsgCK = `AllMessage`;
      const allMsg = await this.cacheService.get(allMsgCK);
      if (allMsg?.length > 0) {
        const uniqAllMsg = uniqBy(allMsg, 'groupChatId');
        await Promise.all(
          uniqAllMsg.map(async (msg) => {
            const timeoutMsgCK = `TimeoutMsg_${msg.groupChatId}`;
            const timeoutMsg = await this.cacheService.get(timeoutMsgCK);
            const fullTimeoutMsgCK = `Fullmessage_${msg.groupChatId}`;
            if (timeoutMsg?.length) {
              await this.chatMessageRepo
                .createQueryBuilder()
                .insert()
                .into(ChatMessage)
                .values(timeoutMsg)
                .onConflict('do nothing')
                .execute();
            }

            await this.cacheService.set(timeoutMsgCK, []);
            await this.cacheService.set(fullTimeoutMsgCK, []);
            await this.cacheService.set(allMsgCK, []);
          }),
        );
      }
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    } finally {
      console.log(
        `[${moment
          .utc()
          .format(
            'dd - DD/MM/YYYY HH:mm:ss',
          )}] - [Job][End] - Save cache messages`,
      );
    }
  }
}

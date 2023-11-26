import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';

@Injectable()
export class ChatMessageScheduler {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectConnection() private readonly connection: Connection,
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
          having count("chat_message"."id") > 50
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
            offset 50
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
}

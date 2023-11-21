import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { MoreThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import moment from 'moment';
import { InjectRepository } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { EGroupChatType } from '../group-chat/dto/group-chat.enum';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { GroupChatSetting } from '../group-chat/entities/group-chat-setting.entity';

@Injectable()
export class GroupChatScheduler {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
  ) {}

  @Cron('0 */30 * * * *', { utcOffset: 0 })
  async clearChatHistory() {
    console.log(
      `[${moment
        .utc()
        .format(
          'dd - DD/MM/YYYY HH:mm:ss',
        )}] - [Job][Begin] - Clear Chat History`,
    );
    try {
      const groupChats = await this.groupChatRepo.find({
        where: {
          type: EGroupChatType.GROUP,
          clearMessageDuration: MoreThan(0),
        },
        relations: ['settings'],
      });

      if (groupChats.length > 0) {
        await Promise.all(
          groupChats.map(async (group: GroupChat) => {
            const clearFrom = moment
              .utc()
              .add(-group.clearMessageDuration, 'minute')
              .toDate();
            const chatMessages = await this.chatMessageRepo
              .createQueryBuilder('chat_message')
              .where('chat_message.groupId = :groupId', { groupId: group.id })
              .andWhere('chat_message.createdAt <= :clearFrom', {
                clearFrom,
              })
              .andWhere('chat_message.pinned = false')
              .getMany();

            // Remove all messages
            if (chatMessages?.length) {
              await this.chatMessageRepo.softDelete(
                chatMessages.map((x) => x.id),
              );

              const unReadSettings = group.settings.filter(
                (x) => x.unReadMessages > 0,
              );
              if (unReadSettings.length) {
                Promise.all(
                  unReadSettings.map(async (setting) => {
                    await this.groupSettingRepo.update(setting.id, {
                      unReadMessages:
                        setting.unReadMessages > chatMessages.length
                          ? setting.unReadMessages - chatMessages.length
                          : 0,
                    });
                  }),
                );
              }
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
          )}] - [Job][End] - Clear Chat History`,
      );
    }
  }
}

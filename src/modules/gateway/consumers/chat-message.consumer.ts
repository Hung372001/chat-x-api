import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '../../rmq/rmq.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { Repository } from 'typeorm';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';

@Controller()
export class ChatMessageConsumer {
  private readonly logger = new Logger(ChatMessageConsumer.name);

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    private rmqService: RmqService,
  ) {}

  @EventPattern('updateUnReadSettings')
  async sendChatMessage(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.debug('Start job update unRead settings');

    try {
      const chatMessage = await this.chatMessageRepo.findOne({
        where: {
          id: data.chatMessageId,
        },
        relations: [
          'sender',
          'sender.profile',
          'group',
          'group.settings',
          'group.settings.user',
        ],
      });

      const unReadSettings = chatMessage.group.settings.filter(
        (x) => x.unReadMessages > 0 && x.user.id !== chatMessage.sender.id,
      );
      if (unReadSettings.length) {
        Promise.all(
          unReadSettings.map(async (setting) => {
            await this.groupSettingRepo.update(setting.id, {
              unReadMessages:
                setting.unReadMessages > 1 ? setting.unReadMessages - 1 : 0,
            });
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

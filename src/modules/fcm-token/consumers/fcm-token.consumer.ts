import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RmqService } from '../../rmq/rmq.service';
import { FCMTokenService } from '../fcm-token.service';

@Controller()
export class FCMTokenConsumer {
  private readonly logger = new Logger(FCMTokenConsumer.name);

  constructor(
    private tokenService: FCMTokenService,
    private rmqService: RmqService,
  ) {}

  @EventPattern('addFCMToken')
  async sendNotification(@Payload() data: any, @Ctx() context: RmqContext) {
    this.logger.debug('Start job add fcm token');

    try {
      await this.tokenService.addFCMToken(data.user, data.createTokenDto);
    } catch (e: any) {
      this.logger.debug(e);
    }

    this.logger.debug('Add fcm token completed');
    this.rmqService.ack(context);
  }
}

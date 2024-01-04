import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { NotificationService } from '../notification.service';
import { RmqService } from '../../rmq/rmq.service';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private notificationService: NotificationService,
    private rmqService: RmqService,
  ) {}

  @EventPattern('sendNotification')
  async sendNotification(@Payload() data: any, @Ctx() context: RmqContext) {
    this.rmqService.ack(context);

    try {
      await this.notificationService.createAndSend(data);
    } catch (e: any) {
      this.logger.debug(e);
    }
  }
}

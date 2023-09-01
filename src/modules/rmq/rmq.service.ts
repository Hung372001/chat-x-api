import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqService {
  constructor(private readonly configService: ConfigService) {}

  getOptions(queue: string, noAck = false): RmqOptions {
    const rmqUser = this.configService.get('RABBITMQ_USER');
    const rmqPassword = this.configService.get('RABBITMQ_PASSWORD');
    const rmqHost = this.configService.get('RABBITMQ_HOST');

    return {
      transport: Transport.RMQ,
      options: {
        urls: [`amqp://${rmqUser}:${rmqPassword}@${rmqHost}`],
        queue: queue,
        noAck,
        prefetchCount: 1,
        persistent: true,
        queueOptions: {
          durable: true,
        },
      },
    };
  }

  ack(context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMessage = context.getMessage();
    channel.ack(originalMessage);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

export interface RmqRegisterInput {
  queueName: string;
  prefetchCount?: number;
  noAck?: boolean;
}

@Injectable()
export class RmqService {
  constructor(private readonly configService: ConfigService) {}

  getOptions({
    queueName,
    prefetchCount = 20,
    noAck = false,
  }: RmqRegisterInput): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.configService.get('RABBITMQ_URI').toString()],
        queue: queueName,
        prefetchCount,
        noAck,
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

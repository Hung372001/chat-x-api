import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { SocketConsumer } from './consumers/socket.consumer';
import { RmqModule } from '../rmq/rmq.module';

@Module({
  imports: [
    GatewayModule,
    RmqModule.register({
      name: 'CHAT_GATEWAY',
      queueName: 'CHAT_GATEWAY_QUEUE_NAME',
    }),
  ],
  controllers: [SocketConsumer],
})
export class SocketModule {}

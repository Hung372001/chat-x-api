import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { SocketConsumer } from './consumers/socket.consumer';
import { RmqModule } from '../rmq/rmq.module';
import { ERmqPrefetch, ERmqQueueName } from '../../common/enums/rmq.enum';

@Module({
  imports: [
    GatewayModule,
    RmqModule.register({
      name: ERmqQueueName.CHAT_GATEWAY,
      queueName: ERmqQueueName.CHAT_GATEWAY,
      prefetchCount: ERmqPrefetch.CHAT_GATEWAY,
    }),
  ],
  controllers: [SocketConsumer],
})
export class SocketModule {}

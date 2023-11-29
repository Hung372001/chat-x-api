import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { SocketController } from './socket.controller';

@Module({
  imports: [GatewayModule],
  controllers: [SocketController],
})
export class SocketModule {}

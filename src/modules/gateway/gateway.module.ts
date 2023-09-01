import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { AppGateway } from './app.gateway';
import { Module } from '@nestjs/common';
import { GatewaySessionManager } from './gateway.session';
import { GroupChatGatewayService } from './group-chat.gateway.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from '../group-chat/entities/group-chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupChat]), UserModule, JwtModule],
  providers: [AppGateway, GatewaySessionManager, GroupChatGatewayService],
  exports: [AppGateway, GatewaySessionManager, GroupChatGatewayService],
})
export class GatewayModule {}

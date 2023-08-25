import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { GroupChatService } from './group-chat.service';
import { GroupChatController } from './group-chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from './entities/group-chat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GroupChat]), UserModule],
  controllers: [GroupChatController],
  providers: [GroupChatService],
  exports: [GroupChatService],
})
export class GroupChatModule {}

import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { GroupChatService } from './group-chat.service';
import { GroupChatController } from './group-chat.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupChat } from './entities/group-chat.entity';
import { GroupChatRequestService } from './group-chat.request.service';

@Module({
  imports: [TypeOrmModule.forFeature([GroupChat]), UserModule],
  controllers: [GroupChatController],
  providers: [GroupChatService, GroupChatRequestService],
  exports: [GroupChatService, GroupChatRequestService],
})
export class GroupChatModule {}

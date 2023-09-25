import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import {} from '../gateway/services/group-chat.gateway.service';
import { SearchService } from './services/search.request.service';
import { SearchController } from './search.controller';
import { GroupChatModule } from '../group-chat/group-chat.module';

@Module({
  imports: [GroupChatModule, UserModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { FilterDto } from '../../common/dto/filter.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../permission/permissison.guard';
import { ChatMessageRequestService } from './chat-message.request.service';

@Controller('chat-message')
@ApiTags('chat-message')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class ChatMessageController {
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly requestService: ChatMessageRequestService,
  ) {}

  @Get('group-chat/:groupChatId')
  findAllForGroupChat(
    @Param('groupChatId') groupChatId: string,
    @Query() query: FilterDto,
  ) {
    return this.requestService.findAllForGroupChat(groupChatId, null, query);
  }

  @Get('contact/:contactUserId')
  findAllForContact(
    @Param('contactUserId') contactUserId: string,
    @Query() query: FilterDto,
  ) {
    return this.requestService.findAllForGroupChat(null, contactUserId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatMessageService.findOneBy({ id });
  }
}

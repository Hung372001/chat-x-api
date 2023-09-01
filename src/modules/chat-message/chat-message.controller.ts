import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { FilterDto } from '../../common/dto/filter.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../permission/permissison.guard';
import { ChatMessageRequestService } from './chat-message.request.service';
import { SendNewMessageDto } from './dto/send-new-message.dto';

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
  findAll(
    @Param('groupChatId') groupChatId: string,
    @Query() query: FilterDto,
  ) {
    return this.requestService.findAllForGroupChat(groupChatId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatMessageService.findOneBy({ id });
  }

  @Post('send')
  sendNewMessage(@Body() dto: SendNewMessageDto) {
    this.requestService.sendNewMessage(dto);
  }

  @Patch('unsend/:id')
  unsendMessage(@Param('id') chatMessageId: string) {
    this.requestService.unsendMessage(chatMessageId);
  }

  @Delete(':id')
  remove(@Param('id') chatMessageId: string) {
    return this.requestService.remove(chatMessageId);
  }
}

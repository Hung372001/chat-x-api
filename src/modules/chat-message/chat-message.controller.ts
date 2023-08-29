import { Controller, Get, Param, Query } from '@nestjs/common';
import { ChatMessageService } from './chat-message.service';
import { FilterDto } from '../../common/dto/filter.dto';

@Controller('chat-message')
export class ChatMessageController {
  constructor(private readonly chatMessageService: ChatMessageService) {}
  @Get()
  findAll(@Query() query: FilterDto) {
    return this.chatMessageService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.chatMessageService.findOneBy({ id });
  }
}

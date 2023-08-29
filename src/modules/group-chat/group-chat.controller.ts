import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { GroupChatService } from './group-chat.service';
import { FilterDto } from '../../common/dto/filter.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('group-chat')
@ApiTags('group-chat')
export class GroupChatController {
  constructor(private readonly groupChatService: GroupChatService) {}

  @Get()
  findAll(@Query() query: FilterDto) {
    return this.groupChatService.findAll(query);
  }

  @Get(':id')
  findByRoomId(@Param('id') id: string) {
    return this.groupChatService.findOneBy({ id });
  }

  @Post()
  create(@Body() dto: CreateGroupChatDto) {
    return this.groupChatService.create(dto);
  }

  @Patch('add-members/:id')
  addMember(@Param('id') roomId: string, @Body() dto: AddMemberDto) {
    return this.groupChatService.addMember(roomId, dto);
  }

  @Patch('remove-members/:id')
  removeMember(@Param('id') roomId: string, @Body() dto: RemoveMemberDto) {
    return this.groupChatService.removeMember(roomId, dto);
  }
}

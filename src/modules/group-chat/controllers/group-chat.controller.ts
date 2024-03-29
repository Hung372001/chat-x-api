import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { FilterDto } from '../../../common/dto/filter.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { RemoveMemberDto } from '../dto/remove-member.dto';
import { CreateGroupChatDto } from '../dto/create-group-chat.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../../permission/permissison.guard';
import { GroupChatRequestService } from '../services/group-chat.request.service';
import { AddAdminDto } from '../dto/add-admin.dto';
import { SendMessageDto } from '../../chat-message/dto/send-message.dto';
import { GetAllGroupChatDto } from '../dto/get-all-group-chat.dto';

@Controller('group-chat')
@ApiTags('group-chat')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class GroupChatController {
  constructor(private readonly requestService: GroupChatRequestService) {}

  @Get()
  findAll(@Query() query: GetAllGroupChatDto) {
    return this.requestService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.requestService.findById(id);
  }

  @Get('members/:id')
  getAllMember(@Param('id') id: string, @Query() query: FilterDto) {
    return this.requestService.getAllMember(id, query);
  }

  @Get('conversation/:userId')
  findConversation(@Param('userId') userId: string) {
    return this.requestService.findConversation(userId);
  }

  @Post()
  create(@Body() dto: CreateGroupChatDto) {
    return this.requestService.create(dto);
  }

  @Patch('add-members/:id')
  addMember(@Param('id') groupId: string, @Body() dto: AddMemberDto) {
    return this.requestService.addMember(groupId, dto);
  }

  @Patch('modify-admin/:id')
  addAdmin(@Param('id') groupId: string, @Body() dto: AddAdminDto) {
    return this.requestService.modifyAdmin(groupId, dto);
  }

  @Patch('remove-members/:id')
  removeMember(@Param('id') groupId: string, @Body() dto: RemoveMemberDto) {
    return this.requestService.removeMember(groupId, dto);
  }

  @Delete(':id')
  removeGroup(@Param('id') groupId: string) {
    return this.requestService.removeGroup(groupId);
  }

  @Patch('leave-group/:id')
  leaveGroup(@Param('id') groupId: string) {
    return this.requestService.leaveGroup(groupId);
  }

  @Patch('offline')
  offline() {
    return this.requestService.offline();
  }

  @Post('send-message')
  sendMessage(@Body() createMessageDto: SendMessageDto) {
    return this.requestService.sendMessage(createMessageDto);
  }
}

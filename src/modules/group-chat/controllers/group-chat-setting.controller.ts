import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FilterDto } from '../../../common/dto/filter.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { RemoveMemberDto } from '../dto/remove-member.dto';
import { CreateGroupChatDto } from '../dto/create-group-chat.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../../permission/permissison.guard';
import { UpdateNicknameDto } from '../dto/update-nickname.dto';
import { GroupChatRequestService } from '../services/group-chat.request.service';
import { GroupChatSettingRequestService } from '../services/group-chat-setting.request.service';

@Controller('group-chat/:id/setting')
@ApiTags('group-chat/setting')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class GroupChatSettingController {
  constructor(
    private readonly requestService: GroupChatSettingRequestService,
  ) {}

  @Get()
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Patch('nickname')
  updateNickname(@Param('id') id: string, @Body() dto: UpdateNicknameDto) {
    return this.requestService.updateNickname(id, dto);
  }

  @Post('clear')
  clearHistory(@Param('id') id: string) {
    return this.requestService.clearHistory(id);
  }

  @Patch('pin/toggle')
  togglePinGroupChat(@Param('id') id: string) {
    return this.requestService.togglePinGroupChat(id);
  }

  @Patch('mute-notification/toggle')
  toggleMuteNotification(@Param('id') id: string) {
    return this.requestService.toggleMuteNotification(id);
  }
}

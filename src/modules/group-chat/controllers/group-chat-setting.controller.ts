import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../../permission/permissison.guard';
import { GroupChatSettingRequestService } from '../services/group-chat-setting.request.service';
import { UpdateClearMessageDurationDto } from '../dto/update-clear-message-duration.dto';

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

  @Patch('clear')
  clearHistory(@Param('id') id: string) {
    return this.requestService.clearHistory(id);
  }

  @Patch('pin/toggle')
  togglePinGroupChat(@Param('id') id: string) {
    return this.requestService.togglePinGroupChat(id);
  }

  @Patch('hiding/toggle')
  toggleHideGroupChat(@Param('id') id: string) {
    return this.requestService.toggleHideGroupChat(id);
  }

  @Patch('mute-notification/toggle')
  toggleMuteNotification(@Param('id') id: string) {
    return this.requestService.toggleMuteNotification(id);
  }

  @Patch('add-friends/toggle')
  toggleAddFriends(@Param('id') id: string) {
    return this.requestService.toggleAddFriends(id);
  }

  @Patch('group-type/toggle')
  toggleGroupType(@Param('id') id: string) {
    return this.requestService.toggleGroupType(id);
  }

  @Patch('chat-feature/toggle')
  toggleChatFeature(@Param('id') id: string) {
    return this.requestService.toggleChatFeature(id);
  }

  @Patch('clear-message-sequence')
  setClearHistorySequence(
    @Param('id') id: string,
    @Body() dto: UpdateClearMessageDurationDto,
  ) {
    return this.requestService.setClearHistorySequence(id, dto);
  }
}

import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { AppGateway } from '../gateway/app.gateway';
import { ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('socket-gateway')
@ApiTags('socket-gateway')
@UseGuards(ApiKeyGuard)
export class SocketController {
  constructor(@Inject(AppGateway) private readonly gateway: AppGateway) {}

  @Post('create-group-chat')
  createGroupChat(@Body() body: any) {
    return this.gateway.createGroupChat(body.newGroupChat);
  }

  @Post('rename-group')
  renameGroupChat(@Body() body: any) {
    const { foundGroupChat, newName } = body;
    return this.gateway.renameGroupChat(foundGroupChat, newName);
  }

  @Post('add-new-member')
  addNewGroupMember(@Body() body: any) {
    const { foundGroupChat, members } = body;
    return this.gateway.addNewGroupMember(foundGroupChat, members);
  }

  @Post('modify-admin')
  modifyGroupAdmin(@Body() body: any) {
    const { foundGroupChat, admins } = body;
    return this.gateway.modifyGroupAdmin(foundGroupChat, admins);
  }

  @Post('remove-member')
  removeGroupMember(@Body() body: any) {
    const { foundGroupChat, members } = body;
    return this.gateway.removeGroupMember(foundGroupChat, members);
  }

  @Post('remove-group-chat')
  removeGroupChat(@Body() body: any) {
    const { foundGroupChat } = body;
    return this.gateway.removeGroupChat(foundGroupChat);
  }

  @Post('offline')
  offline(@Body() body: any) {
    const { currentUser } = body;
    return this.gateway.offline(currentUser);
  }

  @Post('create-friend-group')
  createNewFriendGroup(@Body() body: any) {
    const { friend, currentUser } = body;
    return this.gateway.createNewFriendGroup(friend, currentUser);
  }

  @Post('accept-friend-request')
  acceptFriendRequest(@Body() body: any) {
    const { friend, currentUser } = body;
    return this.gateway.acceptFriendRequest(friend, currentUser);
  }
}

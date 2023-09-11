import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../permission/permissison.guard';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { AddFriendsDto } from './dto/add-friends.dto';
import { FriendRequestService } from './friend.request.service';
import { EFriendRequestStatus } from './dto/friend-request.enum';

@ApiTags('user')
@Controller('user')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class FriendController {
  constructor(private readonly requestService: FriendRequestService) {}

  @Get('friend-request/:userId')
  getFriendRequest(@Param('userId') userId: string) {
    return this.requestService.getFriendRequest(userId);
  }

  @Post('add-friends')
  addFriends(@Body() addFriendsDto: AddFriendsDto) {
    return this.requestService.addFriendRequests(addFriendsDto);
  }

  @Patch('friend-request/accept/:friendId')
  acceptFriendRequest(@Param('friendId') friendId: string) {
    return this.requestService.updateFriendRequest(
      friendId,
      EFriendRequestStatus.ACCEPTED,
    );
  }

  @Patch('friend-request/reject/:friendId')
  rejectFriendRequest(@Param('friendId') friendId: string) {
    return this.requestService.updateFriendRequest(
      friendId,
      EFriendRequestStatus.REJECTED,
    );
  }

  @Post('remove-friend/:friendId')
  removeFriend(@Param('friendId') friendId: string) {
    return this.requestService.removeFriend(friendId);
  }
}

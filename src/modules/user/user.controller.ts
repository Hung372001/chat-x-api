import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../permission/permissison.guard';
import { FilterDto } from '../../common/dto/filter.dto';
import { DeleteResult } from 'typeorm';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { AddFriendsDto } from './dto/add-friends.dto';
import { UserRequestService } from './user.request.service';
import { GetAllUserDto } from './dto/get-all-user.dto';

@ApiTags('user')
@Controller('user')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userRequestService: UserRequestService,
  ) {}

  @Get()
  findAll(@Query() query: GetAllUserDto) {
    return this.userRequestService.findAllUsers(query);
  }

  @Get('me')
  getMe() {
    return this.userRequestService.findMe();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Post('add-friends')
  addFriends(@Body() addFriendsDto: AddFriendsDto) {
    return this.userRequestService.addFriends(addFriendsDto);
  }

  @Post('remove-friend/:friendId')
  removeFriend(@Param('friendId') friendId: string) {
    return this.userRequestService.removeFriend(friendId);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.userService.remove(id);
  }
}

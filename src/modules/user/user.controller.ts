import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../permission/permissison.guard';
import { DeleteResult } from 'typeorm';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { UserRequestService } from './user.request.service';
import { GetAllUserDto } from './dto/get-all-user.dto';
import { GetAllRollCallDto } from './dto/get-all-roll-calls.dto';

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

  @Get('roll-call')
  getAllRollCall(@Query() query: GetAllRollCallDto) {
    return this.userRequestService.findAllRoleCalls(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch('roll-call')
  makeARollCall() {
    return this.userRequestService.makeRollCall();
  }

  // @Post('roll-call')
  // createRollCall(@Body() dto: CreateRollCallDto) {
  //   return this.userRequestService.createRollCall(dto);
  // }

  @Patch('hiding/toggle')
  hiding() {
    return this.userRequestService.hiding();
  }

  @Patch('sound-notification/toggle')
  soundNotification() {
    return this.userRequestService.soundNotification();
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.userService.remove(id);
  }
}

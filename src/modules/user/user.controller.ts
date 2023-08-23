import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../permission/permissison.guard';
import { FilterDto } from '../../common/dto/filter.dto';
import { DeleteResult } from 'typeorm';

@ApiTags('user')
@Controller('user')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query() query: FilterDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.userService.remove(id);
  }
}

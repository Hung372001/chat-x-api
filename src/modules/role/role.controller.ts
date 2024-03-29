import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DeleteResult } from 'typeorm';
import { RoleService } from './role.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from './entities/role.entity';
import { FilterDto } from '../../common/dto/filter.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';

@ApiTags('role')
@Controller('role')
@ApiBearerAuth()
@UseGuards(JwtAccessTokenGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findAll(@Body() query: FilterDto) {
    return this.roleService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findById(id);
  }

  @Post()
  create(@Body() createDto: CreateRoleDto) {
    return this.roleService.create(createDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<Role>,
  ): Promise<Role> {
    return this.roleService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<DeleteResult> {
    return this.roleService.remove(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FilterDto } from '../../common/dto/filter.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../permission/permissison.guard';
import { GroupChatRequestService } from './group-chat.request.service';
import { Roles } from '../../decorators/roles.decorator';
import { ERole } from '../../common/enums/role.enum';

@Controller('group-chat')
@ApiTags('group-chat')
@ApiBearerAuth()
@Roles(ERole.USER)
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class GroupChatController {
  constructor(private readonly requestService: GroupChatRequestService) {}

  @Get()
  findAll(@Query() query: FilterDto) {
    return this.requestService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.requestService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateGroupChatDto) {
    return this.requestService.create(dto);
  }

  @Patch('add-members/:id')
  addMember(@Param('id') roomId: string, @Body() dto: AddMemberDto) {
    return this.requestService.addMember(roomId, dto);
  }

  @Patch('remove-members/:id')
  removeMember(@Param('id') roomId: string, @Body() dto: RemoveMemberDto) {
    return this.requestService.removeMember(roomId, dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { FCMTokenService } from './fcm-token.service';
import { CreateFCMTokenDto } from './dto/create-fcm-token.dto';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../../decorators/roles.decorator';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ERole } from '../../common/enums/role.enum';

@Controller('notification-token')
@ApiTags('notification-token')
@Roles(ERole.USER)
@UseGuards(RolesGuard)
@UseGuards(JwtAccessTokenGuard)
export class FCMTokenController {
  constructor(private readonly fcmTokenService: FCMTokenService) {}

  @Post()
  create(@Body() dto: CreateFCMTokenDto) {
    return this.fcmTokenService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fcmTokenService.remove(id);
  }
}

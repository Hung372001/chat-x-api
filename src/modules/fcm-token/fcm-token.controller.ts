import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CreateFCMTokenDto } from './dto/create-fcm-token.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FCMTokenRequestService } from './fcm-token.request.service';
import { Roles } from '../../decorators/roles.decorator';
import { ERole } from '../../common/enums/role.enum';
import { RemoveFCMTokenDto } from './dto/remove-fcm-token.dto';

@Controller('notification-token')
@ApiTags('notification-token')
export class FCMTokenController {
  constructor(private readonly fcmTokenService: FCMTokenRequestService) {}

  @Post()
  @Roles(ERole.USER)
  @UseGuards(RolesGuard)
  @UseGuards(JwtAccessTokenGuard)
  create(@Body() dto: CreateFCMTokenDto) {
    return this.fcmTokenService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fcmTokenService.remove(id);
  }

  @Delete()
  removeByToken(@Body() dto: RemoveFCMTokenDto) {
    return this.fcmTokenService.removeByToken(dto);
  }
}

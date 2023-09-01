import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationService } from './notification.service';
import { NotificationRequestService } from './notification.request.service';
import { ERole } from '../../common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { FilterDto } from '../../common/dto/filter.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth()
@Roles(ERole.USER)
@UseGuards(RolesGuard)
@UseGuards(JwtAccessTokenGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly requestService: NotificationRequestService,
  ) {}

  @Get()
  findAll(@Query() query: FilterDto) {
    return this.requestService.findAll(query);
  }

  @Post('test')
  sendTestNotification(@Body() dto: SendNotificationDto) {
    return this.notificationService.testing(dto);
  }

  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Patch('read-all')
  updateReadAll() {
    return this.requestService.updateReadAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestService.remove(id);
  }
}

import { Body, Controller, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update.dto';
import { PermissionGuard } from '../permission/permissison.guard';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateNicknameDto } from '../friend/dto/update-nickname.dto';

@ApiTags('profile')
@Controller('profile')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put()
  update(@Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(dto);
  }

  @Patch('avatar')
  updateAvatar(@Body() dto: UpdateAvatarDto) {
    return this.profileService.updateAvatar(dto);
  }
}

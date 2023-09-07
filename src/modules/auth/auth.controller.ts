import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { AuthRequestService } from './auth.request.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PermissionGuard } from '../permission/permissison.guard';
import { JwtAccessTokenGuard } from './guards/jwt-access-token.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ERole } from '../../common/enums/role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly requestService: AuthRequestService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('sign-up')
  signUp(@Body() dto: SignUpDto) {
    return this.authService.signUp(dto);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @UseGuards(JwtAccessTokenGuard)
  @Put('change-password')
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.requestService.changePassword(dto);
  }
}

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { pick } from 'lodash';
import * as bcrypt from 'bcryptjs';
import { SALT_ROUND } from '../../constraints/auth.constraint';
import { User } from '../user/entities/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';

@Injectable({ scope: Scope.REQUEST })
export class AuthRequestService {
  constructor(
    @Inject(REQUEST) private request: Request,
    private userService: UserService,
    private authService: AuthService,
  ) {}

  async changePassword(dto: ChangePasswordDto) {
    try {
      const currentUser = this.request.user as User;

      // Check old password
      const passwordCompare = await bcrypt.compare(
        dto.oldPassword,
        currentUser.hashedPassword,
      );

      if (!passwordCompare) {
        throw { message: 'Mật khẩu cũ không đúng.' };
      }

      const payload = {
        ...pick(currentUser, ['id', 'email', 'phoneNumber', 'username']),
        permissions: currentUser?.roles
          ? currentUser.roles
              .map((role) => JSON.parse(role.permissions))
              .flat(1)
          : [],
      };

      // Save new password
      const salt = await bcrypt.genSalt(SALT_ROUND);
      const newHashedPassword = await bcrypt.hash(dto.newPassword, salt);

      await this.userService.update(currentUser.id, {
        hashedPassword: newHashedPassword,
      });

      // Gen new authenticate token
      const accessToken = this.authService.generateAccessToken(payload);
      const refreshToken = this.authService.generateRefreshToken(payload);
      await this.authService.storeRefreshToken(payload.id, refreshToken);

      return {
        accessToken,
        refreshToken,
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

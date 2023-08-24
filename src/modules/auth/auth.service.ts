import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { pick } from 'lodash';
import { ConfigService } from '@nestjs/config';
import {
  access_token_private_key,
  refresh_token_private_key,
} from '../../constraints/jwt.constraint';
import { TokenPayload } from './interfaces/token.interface';
import * as bcrypt from 'bcryptjs';
import { SignUpDto } from './dto/sign-up.dto';
import { SALT_ROUND } from '../../constraints/auth.constraint';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateAccessToken(payload: TokenPayload) {
    return this.jwtService.sign(payload, {
      algorithm: 'RS256',

      privateKey: access_token_private_key,
      expiresIn: `${this.configService.get(
        'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
      )}s`,
    });
  }

  generateRefreshToken(payload: TokenPayload) {
    return this.jwtService.sign(payload, {
      algorithm: 'RS256',
      privateKey: refresh_token_private_key,
      expiresIn: `${this.configService.get(
        'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
      )}s`,
    });
  }

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const hashedToken = await bcrypt.hash(token, SALT_ROUND);

      await this.userService.setCurrentRefreshToken(userId, hashedToken);
    } catch (error) {
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.userService.findOne([
      { email: dto.email },
      { phoneNumber: dto.phoneNumber },
    ]);

    // const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUND);
    const passwordCompare = await bcrypt.compare(
      dto.password,
      user.hashedPassword,
    );
    if (!user || !passwordCompare) {
      throw new UnauthorizedException();
    }

    const payload = {
      ...pick(user, ['id', 'email', 'phoneNumber', 'username']),
      permissions: user?.roles
        ? user.roles.map((role) => JSON.parse(role.permissions)).flat(1)
        : [],
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    await this.storeRefreshToken(payload.id, refreshToken);
    return {
      accessToken,
      refreshToken,
    };
  }

  async signUp(dto: SignUpDto) {
    const user = await this.userService.findOne([
      { email: dto.email },
      { phoneNumber: dto.phoneNumber },
    ]);

    if (user) {
      throw new HttpException(
        dto.email
          ? 'Email has already registed'
          : 'Phone number has already registed',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.userService.createUserAccount(dto);
  }
}

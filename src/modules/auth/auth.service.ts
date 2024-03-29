import {
  BadRequestException,
  CACHE_MANAGER,
  HttpException,
  HttpStatus,
  Inject,
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
import { User } from '../user/entities/user.entity';
import { CacheService } from '../cache/cache.service';
import moment from 'moment';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: CacheService,
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

  async getUserIfRefreshTokenMatched(
    userId: string,
    refreshToken: string,
  ): Promise<User> {
    try {
      const user = await this.userService.findOneBy({
        id: userId,
      });
      if (!user) {
        throw new UnauthorizedException();
      }

      const isMatching = await bcrypt.compare(
        refreshToken,
        user.currentRefreshToken,
      );
      if (!isMatching) {
        throw new BadRequestException();
      }
      return user;
    } catch (error) {
      throw error;
    }
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
    let user = null;
    let isCachedData = false;

    // Get user from cache user
    user = await this.cacheService.get(`User_${dto.email}_${dto.phoneNumber}`);
    if (!user) {
      if (dto.email) {
        user = await this.userService.findOne({ email: dto.email });
      } else {
        user = await this.userService.findOne({ phoneNumber: dto.phoneNumber });
      }
    } else {
      isCachedData = true;
    }

    if (!user) {
      throw new HttpException(
        dto.email
          ? 'Không tìm thấy địa chỉ email.'
          : 'Không tìm thấy số điện thoại.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Cache user
    if (!isCachedData) {
      await this.cacheService.set(`User_${dto.email}_${dto.phoneNumber}`, user);
    }

    // const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUND);
    const passwordCompare = await bcrypt.compare(
      dto.password,
      user.hashedPassword,
    );

    if (!passwordCompare) {
      throw new HttpException('Mật khẩu không đúng.', HttpStatus.BAD_REQUEST);
    }

    const authResponse = await this.genToken(user);

    return {
      ...user,
      ...authResponse,
    };
  }

  async genToken(user: User) {
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
    let user = null;
    if (dto.email) {
      user = await this.userService.findOne({ email: dto.email });
    } else {
      user = await this.userService.findOne({ phoneNumber: dto.phoneNumber });
    }

    if (user) {
      throw new HttpException(
        dto.email
          ? 'Địa chỉ email đã được đăng ký.'
          : 'Số điện thoại đã được đăng ký.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const registedUser = await this.userService.createUserAccount(dto);
    await this.cacheService.set(`User_${dto.email}_${dto.phoneNumber}`, user);
    const authResponse = await this.genToken(registedUser);

    return {
      ...registedUser,
      ...authResponse,
    };
  }

  async clearCache() {
    return this.cacheService.flushall();
  }
}

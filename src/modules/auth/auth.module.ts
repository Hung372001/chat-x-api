import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '../user/user.module';
import { CustomeCacheModule } from '../cache/cache.module';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAccessTokenStrategy } from './strategies/jwt-access-token.strategy';

@Module({
  imports: [
    UserModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    CustomeCacheModule,
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAccessTokenStrategy,
    // JwtRefreshTokenStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}

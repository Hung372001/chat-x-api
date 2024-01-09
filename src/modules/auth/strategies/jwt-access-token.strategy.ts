import { HttpException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../interfaces/token.interface';
import { access_token_public_key } from 'src/constraints/jwt.constraint';
import { UserService } from '../../user/user.service';
import { CacheService } from '../../cache/cache.service';

@Injectable()
export class JwtAccessTokenStrategy extends PassportStrategy(Strategy) {
  constructor(
    private userService: UserService,
    private cacheService: CacheService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: access_token_public_key,
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.cacheService.get(`User_${payload.id}`);
    return user ? user : await this.userService.findOne({ id: payload.id });
  }
}

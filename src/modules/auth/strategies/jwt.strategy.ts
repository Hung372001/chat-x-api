import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { flattenDeep, uniq } from 'lodash';
import { CacheService } from '../../cache/cache.service';
import { access_token_public_key } from 'src/constraints/jwt.constraint';
import { UserService } from '../../user/user.service';

@Injectable()
/* It extends the PassportStrategy class and overrides the validate method */
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * The constructor function is used to inject the UserService and CacheManager into the JwtStrategy
   * class
   * @param {UserService} userService - This is the service that we created earlier.
   * @param {Cache} cacheManager - This is the cache manager that we injected in the constructor.
   */
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

  /**
   * It takes the payload from the JWT, gets the user's permissions from the cache, and if they're not
   * there, it gets them from the database, and then returns the payload with the permissions added
   * @param {any} payload - The payload that was sent to the server.
   * @returns The payload data, and the permissions.
   */
  async validate(payload: any) {
    /* Getting the email and id from the payload.data, then it is getting the permissions from the
    cache. If the permissions are not in the cache, it gets them from the database. */
    const { id } = payload.data;
    let permissions = await this.cacheService.get(`permissions_${id}`);

    if (!permissions) {
      const user = await this.userService.findOneBy({ id });

      permissions = uniq(flattenDeep(user.roles));

      await this.cacheService.set(`permissions_${id}`, permissions);
    }

    return { ...payload.data, permissions };
  }
}

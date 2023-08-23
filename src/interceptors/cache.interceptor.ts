import {
  CACHE_MANAGER,
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { compact, isEmpty } from 'lodash';
import { CacheService } from 'src/modules/cache/cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  /**
   * It injects the cacheManager service into the constructor.
   * @param {Cache} cacheManager - The cache manager instance.
   */
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private cacheService: CacheService,
  ) {}
  /**
   * "If the request is a GET request, then check if the cache has the response, if it does, return the
   * response, if it doesn't, then make the request and cache the response."
   * </code>
   * @param {ExecutionContext} context - ExecutionContext
   * @param {CallHandler} next - CallHandler - the next interceptor in the chain
   * @returns The return value is an Observable.
   */
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    /* Getting the request object. */
    const req = context.switchToHttp().getRequest();
    const [module, method, params = {}, query = {}] = [
      context.getClass().name,
      context.getHandler().name,
      req.params,
      req.query,
    ];

    const isCachedMethod = [].includes(req.method);

    if (
      isCachedMethod &&
      !Object.keys(params).length &&
      !Object.keys(query).length
    ) {
      return next.handle().pipe();
    }

    /* Checking if the request method is a GET request. */
    if (!isCachedMethod) {
      return next.handle().pipe(
        /* Deleting all the cached items for the controller. */
        tap(async () => {
          await this.cacheService.delController(module);
        }),
      );
    }

    /* Creating a unique key for the request. */
    const key = compact([
      module,
      method,
      !isEmpty(params) ? JSON.stringify({ params }) : null,
      !isEmpty(query) ? JSON.stringify({ query }) : null,
    ]).join('_');

    /* Getting the value from the cache. */
    const value: any = await this.cacheManager.get(key);

    /* Checking if the value is in the cache. */
    if (value) {
      /* Returning the value from the cache. */
      return value;
    }

    return next.handle().pipe(
      /* Setting the response to the cache. */
      tap(async (response) => {
        const controllers: string[] =
          JSON.parse(await this.cacheManager.get(module)) || [];

        const arr = [];

        /* Checking if the key is already in the cache. */
        /* Adding the key to the list of cached items for the controller. */
        if (!controllers.includes(key)) {
          controllers.push(key);
          arr.push(
            this.cacheManager.set(module, JSON.stringify(controllers), 0),
          );
        }
        arr.push(this.cacheManager.set(key, response, 0));

        await Promise.all(arr);
      }),
    );
  }
}

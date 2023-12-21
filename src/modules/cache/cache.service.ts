import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { compact, flattenDeep, uniq } from 'lodash';

const relativeKeys = {
  UserController: ['permissions'],
  RoleController: ['permissions'],
};

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async flushall() {
    const keys = await this.cacheManager.keys();
    await this.cacheManager.del(keys);
  }

  async delByPattern(key: string) {
    const keys = await this.cacheManager.keys();
    if (keys?.length) {
      await this.cacheManager.del(keys.filter((x) => x.match(key)));
    }
  }

  async set(key: string, data: any, deleteRelative?: boolean) {
    const controller = key.split('_')[0];

    if (deleteRelative) {
      const relatives = relativeKeys[controller];
      const keys = uniq(
        flattenDeep(
          await Promise.all(
            [controller, ...(relatives || [])].map((item) => {
              return this.get(item);
            }),
          ),
        ),
      );

      await Promise.all(
        keys.map((key) => {
          return this.del(key);
        }),
      );
    }
    const res = await Promise.all([
      this.cacheManager.set(controller, [key]),
      this.cacheManager.set(key, JSON.stringify(data)),
    ]);
    return res;
  }

  async get(key: string): Promise<any> {
    let res: string = await this.cacheManager.get(key);
    try {
      res = JSON.parse(res);
    } catch (error) {}

    return res;
  }

  async del(key: string) {
    const res = await this.cacheManager.del(key);
    return res;
  }

  async delController(controller: string) {
    const relatives = relativeKeys[controller];
    const keys = uniq(
      flattenDeep(
        compact(
          await Promise.all(
            [controller, ...(relatives || [])].map((item) => {
              return this.get(item);
            }),
          ),
        ),
      ),
    );

    await Promise.all(
      keys.map((key) => {
        return this.del(key);
      }),
    );
    return null;
  }

  async cacheServiceFunc(cacheKey: string, callback: any): Promise<any> {
    const progressingCK = `Progressing_${cacheKey}`;
    const progressing = await this.get(progressingCK);
    let cacheData = await this.get(cacheKey);
    if (!progressing) {
      await this.set(progressingCK, true);
      cacheData = await callback();
      await this.set(cacheKey, cacheData);
      await this.set(progressingCK, false);
    }

    return cacheData;
  }
}

import { Injectable } from '@nestjs/common';
import { differenceBy } from 'lodash';
import { CacheService } from '../../cache/cache.service';

export interface IOnlineSessionManager {
  getUserSession(id: string): boolean;
  setUserSession(id: string, isOnline: boolean): void;
  removeUserSession(id: string): void;
  getSession(): Map<string, boolean>;
}

@Injectable()
export class OnlinesSessionManager implements IOnlineSessionManager {
  private sessions: Map<string, boolean> = null;
  private cacheKey = 'SocketOnlineSessions';

  constructor(private cacheService: CacheService) {}

  async fetchMapData() {
    if (!this.sessions) {
      const cacheData = await this.cacheService.get(this.cacheKey);
      if (cacheData) {
        this.sessions = new Map(JSON.parse(cacheData));
      } else {
        this.sessions = new Map();
      }
    }
  }

  async cacheMapData() {
    const str = JSON.stringify(Array.from(this.sessions.entries()));
    this.cacheService.set(this.cacheKey, str);
  }

  getUserSession(id: string) {
    return this.sessions?.get(id) ?? null;
  }

  async setUserSession(id: string, isOnline: boolean) {
    this.sessions.set(id, isOnline);
    await this.cacheMapData();
  }

  async removeUserSession(id: string) {
    this.sessions.delete(id);
    await this.cacheMapData();
  }

  getSession(): Map<string, boolean> {
    return this.sessions;
  }
}

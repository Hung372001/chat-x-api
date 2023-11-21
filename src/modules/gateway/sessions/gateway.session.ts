import { Injectable } from '@nestjs/common';
import { differenceBy } from 'lodash';
import { CacheService } from '../../cache/cache.service';

export interface IGatewaySessionManager<T> {
  getUserSession(id: string): T[];
  setUserSession(name: string, id: string, data: T): void;
  removeUserSession(name: string, id: string, data: T): void;
  getSession(): Map<string, T[]>;
}

@Injectable()
export class GatewaySessionManager<T> implements IGatewaySessionManager<T> {
  private sessions: Map<string, T[]> = null;

  constructor(private cacheService: CacheService) {}

  async fetchMapData(name: string) {
    if (!this.sessions) {
      const cacheData = await this.cacheService.get(`GatwaySessions_${name}`);
      if (cacheData) {
        this.sessions = new Map(JSON.parse(cacheData));
      } else {
        this.sessions = new Map();
      }
    }
  }

  async cacheMapData(name: string) {
    const str = JSON.stringify(Array.from(this.sessions.entries()));
    this.cacheService.set(`GatwaySessions_${name}`, str);
  }

  getUserSession(id: string) {
    return this.sessions?.get(id) ?? null;
  }

  async setUserSession(name: string, id: string, data: T) {
    let userSession = this.sessions.get(id);
    if (userSession) {
      userSession.push(data);
    } else {
      userSession = [data];
    }
    this.sessions.set(id, userSession);
    await this.cacheMapData(name);
  }

  async removeUserSession(name: string, id: string, data: T) {
    const userSession = this.sessions.get(id);
    const remainSession = differenceBy(userSession, [data], 'user.id');
    if (remainSession.length) {
      this.sessions.set(id, remainSession);
    } else {
      this.sessions.delete(id);
    }
    await this.cacheMapData(name);
  }

  getSession(): Map<string, T[]> {
    return this.sessions;
  }
}

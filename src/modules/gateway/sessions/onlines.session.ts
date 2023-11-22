import { Injectable } from '@nestjs/common';
import { differenceBy } from 'lodash';

export interface IOnlineSessionManager {
  getUserSession(id: string): boolean;
  setUserSession(id: string, isOnline: boolean): void;
  removeUserSession(id: string): void;
  getSession(): Map<string, boolean>;
}

@Injectable()
export class OnlinesSessionManager implements IOnlineSessionManager {
  private readonly sessions: Map<string, boolean> = new Map();

  getUserSession(id: string) {
    return this.sessions.get(id);
  }

  setUserSession(id: string, isOnline: boolean) {
    this.sessions.set(id, isOnline);
  }

  removeUserSession(id: string) {
    this.sessions.delete(id);
  }

  getSession(): Map<string, boolean> {
    return this.sessions;
  }
}

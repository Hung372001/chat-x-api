import { Injectable } from '@nestjs/common';
import { differenceBy } from 'lodash';

export interface IUserGroupSessionManager<T> {
  getUserSession(id: string): T[];
  setUserSession(id: string, data: T): void;
  removeUserSession(id: string, data: T): void;
  getSession(): Map<string, T[]>;
}

@Injectable()
export class UserGroupSessionManager<T> implements IUserGroupSessionManager<T> {
  private readonly sessions: Map<string, T[]> = new Map();

  getUserSession(id: string) {
    return this.sessions.get(id);
  }

  setUserSession(id: string, data: T) {
    let userSession = this.sessions.get(id);
    if (userSession) {
      userSession.push(data);
    } else {
      userSession = [data];
    }
    this.sessions.set(id, userSession);
  }

  removeUserSession(id: string, data: T) {
    const userSession = this.sessions.get(id);
    const remainSession = differenceBy(userSession, [data], 'user.id');
    if (remainSession.length) {
      this.sessions.set(id, remainSession);
    } else {
      this.sessions.delete(id);
    }
  }

  getSession(): Map<string, T[]> {
    return this.sessions;
  }
}

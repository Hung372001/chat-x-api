import { Injectable } from '@nestjs/common';
import { AuthSocket } from './interfaces/auth.interface';

export interface IGatewaySessionManager {
  getUserSocket(id: string): AuthSocket;
  setUserSocket(id: string, socket: AuthSocket): void;
  removeUserSocket(id: string): void;
  getSockets(): Map<string, AuthSocket>;
}

@Injectable()
export class GatewaySessionManager implements IGatewaySessionManager {
  private readonly sessions: Map<string, AuthSocket> = new Map();

  getUserSocket(id: string) {
    return this.sessions.get(id);
  }

  setUserSocket(userId: string, socket: AuthSocket) {
    this.sessions.set(userId, socket);
  }
  removeUserSocket(userId: string) {
    this.sessions.delete(userId);
  }
  getSockets(): Map<string, AuthSocket> {
    return this.sessions;
  }
}

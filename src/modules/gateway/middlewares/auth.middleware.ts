import { UserService } from '../../user/user.service';
import { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { AuthSocket } from '../interfaces/auth.interface';

export type SocketMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

export const WSAuthMiddleware = (
  jwtService: JwtService,
  userService: UserService,
): SocketMiddleware => {
  return async (socket: AuthSocket, next) => {
    try {
      if (!socket.handshake.query.token?.includes(' ')) {
        throw Error('Authorization must be not empty.');
      }

      const token = socket.handshake.query.token.toString().split(' ')[1];

      if (!token) {
        throw Error('Token doesnot found.');
      }

      const decodedJwt = jwtService.decode(token) as any;
      if (!decodedJwt) {
        throw Error('System cannot decode the token.');
      }

      const currentUser = await userService.findOne({ id: decodedJwt.id });

      if (!currentUser) {
        throw Error('User doesnot found.');
      }

      socket.data.user = currentUser;
      next();
    } catch (e) {
      next({
        name: 'Unauthorized',
        message: e?.message ?? 'Unauthorized',
      });
    }
  };
};

import { Socket } from 'socket.io';
import { User } from '../../user/entities/user.entity';

export interface AuthSocket extends Socket {
  user: User;
}

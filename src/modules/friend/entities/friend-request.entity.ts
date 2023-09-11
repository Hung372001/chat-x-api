import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EFriendRequestStatus } from '../dto/friend-request.enum';
import { User } from '../../user/entities/user.entity';

@Entity()
export class FriendRequest extends BaseEntity {
  @ManyToOne(() => User, (fromUser) => fromUser.requestFromUsers)
  @JoinColumn()
  fromUser: User;

  @ManyToOne(() => User, (toUser) => toUser.requestToUsers)
  @JoinColumn()
  toUser: User;

  @Column({
    type: 'enum',
    enum: EFriendRequestStatus,
    default: EFriendRequestStatus.WAITING,
  })
  status: EFriendRequestStatus;
}

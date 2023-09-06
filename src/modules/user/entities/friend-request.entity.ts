import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { EFriendRequestStatus } from '../dto/friend-request.enum';

@Entity()
export class FriendRequest extends BaseEntity {
  @OneToOne(() => User)
  @JoinColumn()
  fromUser: User;

  @OneToOne(() => User)
  @JoinColumn()
  toUser: User;

  @Column({
    type: 'enum',
    enum: EFriendRequestStatus,
    default: EFriendRequestStatus.WAITING,
  })
  status: EFriendRequestStatus;
}

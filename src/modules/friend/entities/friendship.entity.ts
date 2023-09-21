import { Column, Entity, JoinTable, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Friendship extends BaseEntity {
  @Column({ nullable: true })
  nickname: string;

  @ManyToOne(() => User, (user) => user.friends)
  @JoinTable()
  toUser: User;

  @ManyToOne(() => User, (user) => user.beFriends)
  @JoinTable()
  fromUser: User;
}

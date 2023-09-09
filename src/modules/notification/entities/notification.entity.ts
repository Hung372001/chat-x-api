import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';
import { ENotificationType } from '../dto/enum-notification';
import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class Notification extends BaseEntity {
  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, default: '' })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: ENotificationType,
    default: ENotificationType.NORMAL,
  })
  type: ENotificationType;

  @ManyToOne(() => User, (receiver) => receiver.notifications)
  user: User;

  @Column({ default: false })
  isRead: boolean;
}

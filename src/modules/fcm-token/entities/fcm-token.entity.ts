import { EDiviceType } from '../dto/enum-fcm-token';
import { Column, Entity, JoinTable, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class FCMToken extends BaseEntity {
  @Column()
  deviceToken: string;

  @Column({
    type: 'enum',
    enum: EDiviceType,
    default: EDiviceType.WEBSITE,
  })
  deviceType: EDiviceType;

  @ManyToOne(() => User, (user) => user.deviceTokens)
  @JoinTable()
  user: User;
}

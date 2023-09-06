import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { EGender } from '../dto/profile.enum';

@Entity()
export class Profile extends BaseEntity {
  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: EGender,
    default: EGender.MALE,
  })
  gender: EGender;

  @Column({ type: 'decimal', default: 0 })
  activityScore: number;

  @Column({ type: 'decimal', default: 0 })
  creditScore: number;
}

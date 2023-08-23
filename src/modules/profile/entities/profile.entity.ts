import { Column, Entity } from 'typeorm';
import { ProfileImageDetail } from '../types/profile-image.interface';
import { ITelegramData } from '../interfaces/profile.interface';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity()
export class Profile extends BaseEntity {
  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ type: 'jsonb', nullable: true })
  avatarDetail: ProfileImageDetail;

  @Column({ nullable: true })
  coverPhoto: string;

  @Column({ type: 'jsonb', nullable: true })
  coverPhotoDetail: ProfileImageDetail;

  @Column({
    type: 'text',
    nullable: true,
  })
  introduce: string;

  @Column({ default: 0 })
  followerNumber: number;

  @Column({ default: 0 })
  followingNumber: number;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  telegramData: ITelegramData;
}

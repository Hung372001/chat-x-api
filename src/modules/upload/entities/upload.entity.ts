import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity()
export class UploadFile extends BaseEntity {
  @Column()
  url: string;

  @Column()
  key: string;

  @ManyToOne(() => User, (owner) => owner.uploadFiles)
  @JoinColumn()
  owner: User;
}

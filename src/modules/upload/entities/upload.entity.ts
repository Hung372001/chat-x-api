import { Column, Entity, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@common/entities/base.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class UploadFile extends BaseEntity {
  @Column()
  public url: string;

  @Column()
  public key: string;

  @OneToMany(() => User, (owner) => owner.uploadFiles)
  @JoinColumn()
  owner: User;
}

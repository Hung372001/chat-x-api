import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity()
export class Role extends BaseEntity {
  @Column()
  name: string;

  @Column()
  permissions: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  description: string;
}

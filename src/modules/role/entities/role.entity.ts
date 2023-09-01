import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ERole } from '../../../common/enums/role.enum';

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

  @Column({
    type: 'enum',
    enum: ERole,
    default: ERole.USER,
  })
  type: ERole;
}

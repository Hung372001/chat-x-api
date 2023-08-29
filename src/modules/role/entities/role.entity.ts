import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ERoleType } from '../dto/role.enum';

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
    enum: ERoleType,
    default: ERoleType.USER,
  })
  type: ERoleType;
}

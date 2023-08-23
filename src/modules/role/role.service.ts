import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Role } from './entities/role.entity';
import { BaseService } from '../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RoleService extends BaseService<Role> {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {
    super(roleRepository);
  }

  override async create(createRoleDto: CreateRoleDto): Promise<Role> {
    try {
      const { name, permissions, description } = createRoleDto;

      // check role exist
      const foundRole = await this.roleRepository.findOneBy({ name });

      if (foundRole) {
        throw { message: `Role name already exists.` };
      }

      const role = await this.roleRepository.create({
        name,
        permissions: JSON.stringify(permissions),
        description,
      });
      const data = await this.roleRepository.save(role);

      return data;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

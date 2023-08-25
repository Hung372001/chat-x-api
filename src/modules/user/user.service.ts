import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RoleService } from '../role/role.service';
import { BaseService } from '../../common/services/base.service';
import { ERole } from '../../common/enums/role.enum';
import { ProfileService } from '../profile/profile.service';
import { pick } from 'lodash';
import { SignUpDto } from '../auth/dto/sign-up.dto';
import * as bcrypt from 'bcryptjs';
import { SALT_ROUND } from '../../constraints/auth.constraint';

export class UserService extends BaseService<User> {
  private SALT_ROUND = 10;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private roleService: RoleService,
    private profileService: ProfileService,
  ) {
    super(userRepository);
  }

  async findOne(
    query: FindOptionsWhere<User> | FindOptionsWhere<User>[],
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: query,
      relations: ['roles', 'profile'],
    });
  }

  async setCurrentRefreshToken(id: string, hashedToken: string): Promise<void> {
    try {
      await this.userRepository.update(id, {
        currentRefreshToken: hashedToken,
      });
    } catch (error) {
      throw error;
    }
  }

  async createUserAccount(dto: SignUpDto) {
    const existedUsername = await this.userRepository.findOneBy({
      username: dto.username,
    });
    if (existedUsername) {
      throw new HttpException(
        'Username has already existed.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundRole = await this.roleService.findOneBy({ name: ERole.USER });
    if (!foundRole) {
      throw new HttpException(
        'User role is not found.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newProfile = await this.profileService.create({});

    const salt = await bcrypt.genSalt(SALT_ROUND);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.userRepository.create({
      ...pick(dto, ['id', 'email', 'phoneNumber', 'username']),
      hashedPassword,
      roles: [foundRole],
      profile: newProfile,
    });
    const newUser = await this.userRepository.save(user);
    return newUser;
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import {
  Connection,
  DeleteResult,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { RoleService } from '../role/role.service';
import { BaseService } from '../../common/services/base.service';
import { ERole } from '../../common/enums/role.enum';
import { pick } from 'lodash';
import { SignUpDto } from '../auth/dto/sign-up.dto';
import * as bcrypt from 'bcryptjs';
import { SALT_ROUND } from '../../constraints/auth.constraint';
import { Profile } from '../profile/entities/profile.entity';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class UserService extends BaseService<User> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    private roleService: RoleService,
    private cacheService: CacheService,
    @InjectConnection() private connection: Connection,
  ) {
    super(userRepository);
  }

  async findOne(
    query: FindOptionsWhere<User> | FindOptionsWhere<User>[],
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: { ...query, isActive: true },
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
        'Tên người dùng đã tồn tại.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const foundRole = await this.roleService.findOneBy({ name: ERole.USER });
    if (!foundRole) {
      throw new HttpException(
        'Vai trò của tài khoản không xác định.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newProfile = await this.profileRepository.save(new Profile());

    const salt = await bcrypt.genSalt(SALT_ROUND);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = (await this.userRepository.create({
      ...pick(dto, ['id', 'email', 'phoneNumber', 'username']),
      hashedPassword,
      roles: [foundRole],
      profile: newProfile,
    })) as unknown as User;
    const newUser = await this.userRepository.save(user);
    return newUser;
  }

  override async remove(id: string): Promise<DeleteResult> {
    try {
      const currentUser = await this.findById(id);

      if (!currentUser) {
        throw { message: `${this.name} is not found.` };
      }

      // Clear cache
      await this.cacheService.del(
        `User_${currentUser.email}_${currentUser.phoneNumber}`,
      );
      await this.cacheService.del(`User_${currentUser.id}`);

      const groupChats = await this.connection.query(`
        select "group_chat"."id"
        from "group_chat"
        left join "group_chat_members_user"
        on "group_chat_members_user"."groupChatId" = "group_chat"."id"
        where "group_chat_members_user"."userId" = '${currentUser.id}'
      `);

      if (groupChats?.length) {
        await Promise.all(
          groupChats.map(async (group) => {
            await this.cacheService.del(
              `GroupChat_${JSON.stringify(group.id)}`,
            );
            await this.cacheService.del(
              `GroupChatAdmins_${JSON.stringify(group.id)}`,
            );
          }),
        );
      }

      return await this.userRepository.softDelete(id);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

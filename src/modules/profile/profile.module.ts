import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { User } from '../user/entities/user.entity';
import { CustomeCacheModule } from '../cache/cache.module';

@Module({
  imports: [TypeOrmModule.forFeature([Profile, User]), CustomeCacheModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

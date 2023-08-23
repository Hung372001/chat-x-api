import { Inject, Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { BaseService } from '../../common/services/base.service';

@Injectable({ scope: Scope.REQUEST })
export class ProfileService extends BaseService<Profile> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {
    super(profileRepository);
  }
}

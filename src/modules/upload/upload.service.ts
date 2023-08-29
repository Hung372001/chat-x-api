import { Inject, Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadFile } from './entities/upload.entity';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { User } from '../user/entities/user.entity';

@Injectable({ scope: Scope.REQUEST })
export class UploadService {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(UploadFile)
    private uploadRepository: Repository<UploadFile>,
    private configService: ConfigService,
  ) {}

  async uploadFile(dataBuffer: Buffer, file: any) {
    const currentUser = this.request.user as User;

    const { originalname, mimetype } = file;
    const s3 = new S3();
    const uploadResult = await s3
      .upload({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Body: dataBuffer,
        Key: `${uuid()}-${originalname}`,
        ACL: 'public-read',
        ContentType: mimetype,
        ContentDisposition: 'inline',
      })
      .promise();

    const newFile = this.uploadRepository.create({
      key: uploadResult.Key,
      url: uploadResult.Location,
      owner: currentUser,
    });
    await this.uploadRepository.save(newFile);
    return newFile;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UploadFile } from './entities/upload.entity';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(UploadFile)
    private uploadRepository: Repository<UploadFile>,
    private configService: ConfigService,
  ) {}

  async uploadFile(dataBuffer: Buffer, filename: string) {
    const s3 = new S3();
    const uploadResult = await s3
      .upload({
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Body: dataBuffer,
        Key: `${uuid()}-${filename}`,
      })
      .promise();

    const newFile = this.uploadRepository.create({
      key: uploadResult.Key,
      url: uploadResult.Location,
    });
    await this.uploadRepository.save(newFile);
    return newFile;
  }
}

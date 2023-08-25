import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadFile } from './entities/upload.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [TypeOrmModule.forFeature([UploadFile]), ConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}

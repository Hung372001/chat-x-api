import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('upload')
@ApiTags('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async addAvatar(@UploadedFile() file) {
    return this.uploadService.uploadFile(file.buffer, file.originalname);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10))
  multiUpload(@UploadedFiles() files) {
    return Promise.all(
      files.map((file) => {
        this.uploadService.uploadFile(file.buffer, file.originalname);
      }),
    );
  }
}

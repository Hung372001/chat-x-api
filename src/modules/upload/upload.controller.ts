import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ERole } from '../../common/enums/role.enum';

@Controller('upload')
@ApiTags('upload')
@ApiBearerAuth()
@Roles(ERole.USER)
@UseGuards(RolesGuard)
@UseGuards(JwtAccessTokenGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async addAvatar(@UploadedFile() file) {
    return this.uploadService.uploadFile(file.buffer, file);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10))
  multiUpload(@UploadedFiles() files) {
    return Promise.all(
      files.map((file) => {
        this.uploadService.uploadFile(file.buffer, file);
      }),
    );
  }
}

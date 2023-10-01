import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  FileTypeValidator,
  ParseFilePipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { extname } from 'path';
import { UploadService } from './upload.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ERole } from '../../common/enums/role.enum';

const multerOptions = {
  fileFilter: (req: any, file: any, cb: any) => {
    const extFile = extname(file.originalname);
    if (
      extFile
        .toLowerCase()
        .match(/.(jpg|jpeg|gif|png|mp4|mov|wmv|avi|flv|mpeg-2)$/)
    ) {
      cb(null, true);
    } else {
      cb(
        new HttpException(
          `Không hỗ trợ file có định dạng ${extFile}`,
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        ),
        false,
      );
    }
  },
};

@Controller('upload')
@ApiTags('upload')
@ApiBearerAuth()
@Roles(ERole.USER)
@UseGuards(RolesGuard)
@UseGuards(JwtAccessTokenGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async addAvatar(
    @UploadedFile()
    file,
  ) {
    return this.uploadService.uploadFile(file.buffer, file);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  async multiUpload(
    @UploadedFiles()
    files,
  ) {
    return await Promise.all(
      files.map((file) => {
        return this.uploadService.uploadFile(file.buffer, file);
      }),
    );
  }
}

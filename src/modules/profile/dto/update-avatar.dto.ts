import { ApiProperty } from '@nestjs/swagger';
import { IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAvatarDto {
  @ApiProperty()
  @IsUrl({}, { message: 'Đường dẫn avatar không hợp lệ.' })
  @Type(() => IsUrl)
  avatar: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAvatarDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUrl({}, { message: 'Đường dẫn avatar không hợp lệ.' })
  @Type(() => IsUrl)
  avatar: string;
}

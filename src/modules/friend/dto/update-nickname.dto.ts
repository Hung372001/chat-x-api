import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateNicknameDto {
  @ApiProperty()
  @IsNotEmpty()
  nickname: string;
}

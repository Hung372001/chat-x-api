import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateNicknameDto {
  @ApiPropertyOptional()
  @IsOptional()
  nickname: string;
}

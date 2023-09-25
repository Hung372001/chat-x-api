import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { ESearchType } from './search.enum';

export class SearchDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ESearchType)
  @Transform(({ value }) => (value ? value.trim() : null))
  type = ESearchType.ALL;

  @ApiPropertyOptional({
    type: 'string',
    description:
      'search by username, nickname, phone number, email for user and search by group name for group chat',
  })
  @IsOptional()
  keyword: string;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  sortBy: string;

  @ApiPropertyOptional({ enum: ['DESC', 'ASC'], default: 'ASC' })
  @IsOptional()
  sortOrder: 'DESC' | 'ASC';

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform((raw) => +raw.value)
  limit: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform((raw) => +raw.value)
  page: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @Transform(({ value }) => {
    return value === 'true' || value === true || value === 1;
  })
  isGetAll: boolean;
}

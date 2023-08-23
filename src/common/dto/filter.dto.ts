import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

export class FilterDto {
  @ApiPropertyOptional({
    type: 'any',
    description: 'string array or string',
    example: '["email@gmail.com", "fullname"] or keyword',
  })
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  })
  orKeyword: any;

  @ApiPropertyOptional({
    isArray: true,
    description: 'search or keyword with fields in searchOrBy array',
    example: '["email", "fullname"]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value ? [value] : value;
    }
  })
  @IsArray()
  @IsOptional()
  searchOrBy: string[];

  @ApiPropertyOptional({
    type: 'any',
    description: 'string array or string',
    example: '["email@gmail.com", "fullname"] or keyword',
  })
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  })
  andKeyword: any;

  @ApiPropertyOptional({
    isArray: true,
    description: 'search and keyword with field in searchAndBy array',
    example: '["email", "fullname"]',
  })
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value ? [value] : value;
    }
  })
  @IsArray()
  @IsOptional()
  searchAndBy: string[];

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

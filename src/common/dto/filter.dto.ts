import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

export class FilterDto {
  @ApiPropertyOptional({
    type: 'string',
    description:
      'Keyword for searchBy (OR conditions) (type: string || string[])',
    example:
      'search keyword || ["search keyword for searchBy[0]", "search keyword for searchBy[1]"]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  })
  keyword: any;

  @ApiPropertyOptional({
    description:
      'Search by fields item (OR conditions) (type: string || string[])',
    example: 'field name || ["field1", "field2"]',
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
  searchBy: string[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'Keyword for searchAndBy (AND conditions) (type: string || string[])',
    example:
      'search keyword || ["search keyword for searchAndBy[0]", "search keyword for searchAndBy[1]"]',
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
    description:
      'Search by fields item (AND conditions) (type: string || string[])',
    example: 'field name || ["field1", "field2"]',
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

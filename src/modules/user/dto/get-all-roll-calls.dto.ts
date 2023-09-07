import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class GetAllRollCallDto {
  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  @IsDate()
  @Transform((raw) => new Date(raw.value))
  fromDate: Date;

  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  @IsDate()
  @Transform((raw) => new Date(raw.value))
  toDate: Date;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  sortBy = 'checkedDate';

  @ApiPropertyOptional({ enum: ['DESC', 'ASC'], default: 'ASC' })
  @IsOptional()
  sortOrder: 'DESC' | 'ASC' = 'DESC';
}

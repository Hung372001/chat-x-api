import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class GetAllRollCallDto {
  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  fromDate: Date;

  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  toDate: Date;

  @ApiPropertyOptional({ default: 'createdAt' })
  @IsOptional()
  sortBy = 'checkedDate';

  @ApiPropertyOptional({ enum: ['DESC', 'ASC'], default: 'ASC' })
  @IsOptional()
  sortOrder: 'DESC' | 'ASC' = 'DESC';
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class CreateRollCallDto {
  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  @IsDate()
  @Transform((raw) => new Date(raw.value))
  checkedDate: Date;
}

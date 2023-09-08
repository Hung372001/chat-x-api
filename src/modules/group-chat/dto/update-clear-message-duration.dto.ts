import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateClearMessageDurationDto {
  @ApiProperty({
    description: 'Clear message duration (unit: minutes)',
    example:
      'duration = 0 => disable, duration = 30 => 30 minutes, duration = 60 => 1 hour, duration = 120 => 2 hours',
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Giá trị không được âm.' })
  @Transform((raw) => +raw.value)
  duration: number;
}

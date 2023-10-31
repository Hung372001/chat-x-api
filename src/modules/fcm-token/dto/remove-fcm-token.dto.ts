import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class RemoveFCMTokenDto {
  @ApiProperty({
    description: 'FCM device token',
  })
  @IsNotEmpty()
  @Transform((raw) => raw.value.trim())
  deviceToken: string;
}

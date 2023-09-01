import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { EDiviceType } from './enum-fcm-token';

export class CreateFCMTokenDto {
  @ApiProperty({
    description: 'FCM device token',
  })
  @IsNotEmpty()
  @Transform((raw) => raw.value.trim())
  deviceToken: string;

  @ApiPropertyOptional({
    enum: EDiviceType,
    description: 'Device type',
  })
  deviceType: EDiviceType;
}

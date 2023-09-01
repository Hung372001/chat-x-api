import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { ENotificationType } from './enum-notification';

export class CreateNotificationDto {
  @ApiProperty({
    example: 'Title of notification',
  })
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Notification content',
  })
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'Received user id',
  })
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    enum: ENotificationType,
    example: 'NORMAL',
  })
  notificationType?: ENotificationType;
}

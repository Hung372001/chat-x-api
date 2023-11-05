import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ENotificationType } from './enum-notification';
import { User } from '../../user/entities/user.entity';

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

  user?: User;

  @ApiPropertyOptional({
    example: 'Image url',
  })
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    enum: ENotificationType,
    example: 'NORMAL',
  })
  @IsOptional()
  notificationType?: ENotificationType;

  @ApiPropertyOptional()
  @IsOptional()
  data?: any;
}

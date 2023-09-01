import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SendNotificationDto {
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
    description: 'FCM device token',
  })
  @IsNotEmpty()
  deviceToken: string;
}

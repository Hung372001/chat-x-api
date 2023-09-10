import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';

export class ReadMessageDto {
  @ApiProperty({ description: 'Group chat id get from get list api' })
  @IsNotEmpty()
  @Transform((raw) => raw.value.trim())
  groupId: string;

  @ApiProperty({
    description: 'Read message id array',
  })
  @IsNotEmpty()
  @IsArray()
  messageIds: string[];
}

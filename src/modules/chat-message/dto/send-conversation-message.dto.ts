import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class SendConversationMessageDto {
  @ApiProperty({ description: 'Group chat id get from get list api' })
  @IsNotEmpty()
  @Transform((raw) => raw.value.trim())
  receiverId: string;

  @ApiPropertyOptional({ description: 'Message content' })
  @IsOptional()
  message: string;

  @ApiPropertyOptional({ description: 'Included images' })
  @IsOptional()
  @IsArray()
  @Type(() => IsUrl)
  imageUrls: string[];

  @ApiPropertyOptional({
    description: 'Included documents (video, text file, ...)',
  })
  @IsOptional()
  @IsUrl()
  @Type(() => IsUrl)
  documentUrls: string[];
}

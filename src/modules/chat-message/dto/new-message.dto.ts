import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class NewMessageDto {
  @IsNotEmpty()
  @Transform((raw) => raw.value.trim())
  groupId: string;

  @IsOptional()
  message: string;

  @IsOptional()
  @IsArray()
  @Type(() => IsUrl)
  imageUrls: string[];

  @IsOptional()
  @IsUrl()
  @Type(() => IsUrl)
  documentUrls: string[];
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class AddFriendsDto {
  @ApiProperty({
    description: 'Array friend id (userId)',
    example:
      '["5dd0ef9c-8b6e-4df2-a58a-b0be50a2f447", "c06314c3-2911-4cfa-89fd-1bf7d092178d"]',
  })
  @IsNotEmpty()
  @IsArray()
  @Type(() => IsString)
  friends: string[];
}

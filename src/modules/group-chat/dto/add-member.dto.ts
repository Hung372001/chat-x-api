import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty } from 'class-validator';
import { uniq } from 'lodash';

export class AddMemberDto {
  @ApiProperty({
    description: 'User id string array',
    example: [
      '809b60b0-edc4-4523-9f1c-f3191eea077a',
      'c4c662b2-7ba9-490c-a5e2-4e52e07609ac',
    ],
  })
  @IsNotEmpty()
  @IsArray()
  @Transform(({ value }) => uniq(value))
  members: string[];
}

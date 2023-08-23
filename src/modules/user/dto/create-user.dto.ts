import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: '0x410804dda338F103B6A14FAc8176263Ca092548C' })
  @IsNotEmpty()
  @Transform(({ value }) => value.toLowerCase())
  walletAddress: string;
}

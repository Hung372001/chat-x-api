import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => !o.phoneNumber)
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber('VN')
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  password: number;
}

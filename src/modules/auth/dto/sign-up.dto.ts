import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SignUpDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => !o.phoneNumber)
  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ.' })
  @Transform(({ value }) => (value ? value.trim() : null))
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ.' })
  @Transform(({ value, obj }) => (obj.email ? null : value.trim()))
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  username: string;
}

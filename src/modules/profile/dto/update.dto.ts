import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsPhoneNumber } from 'class-validator';
import { EGender } from './profile.enum';

export class UpdateProfileDto {
  @ApiProperty()
  @IsPhoneNumber('VN', { message: 'Số điện thoại không hợp lệ.' })
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEnum(EGender)
  gender: EGender;
}

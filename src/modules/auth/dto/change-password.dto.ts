import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsStrongPassword } from 'class-validator';
import { Match } from '../../../decorators/match.decorator';
import { Unmatch } from '../../../decorators/unmatch.decorator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsStrongPassword({}, { message: 'Độ bảo mật của mật khẩu thấp.' })
  @Unmatch('oldPassword', {
    message: 'Mật khẩu mới không được trùng với mật khẩu cũ.',
  })
  newPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Match('newPassword', { message: 'Xác nhận mật khẩu mới không đúng.' })
  confirmedNewPassword: string;
}

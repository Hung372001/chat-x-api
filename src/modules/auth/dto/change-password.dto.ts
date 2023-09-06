import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Match } from '../../../decorators/match.decorator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @ValidateIf((o) => o.oldPassword === o.newPassword, {
    message: 'Mật khẩu mới không được trùng với mật khẩu cũ.',
  })
  newPassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Match('newPassword', { message: 'Xác nhận mật khẩu mới không đúng.' })
  confirmedNewPassword: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { EnumPermission } from '../../../common/enums/permission.enum';

export class CreateRoleDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: EnumPermission })
  @IsNotEmpty()
  permissions: EnumPermission[];

  @ApiPropertyOptional()
  @IsOptional()
  description: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FilterDto } from '../../../common/dto/filter.dto';

export class GetAllUserDto extends FilterDto {
  @ApiPropertyOptional({
    description: 'Only get your friends',
  })
  @IsOptional()
  onlyFriend: boolean;
}

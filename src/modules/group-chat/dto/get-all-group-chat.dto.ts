import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterDto } from '../../../common/dto/filter.dto';
import { IsOptional } from 'class-validator';

export class GetAllGroupChatDto extends FilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  unReadGroups: boolean;
}

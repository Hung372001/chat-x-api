import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, ValidateIf } from 'class-validator';
import { EGroupChatType } from './group-chat.enum';

export class RenameGroupChatDto {
  @ApiPropertyOptional({ description: 'Group name' })
  @ValidateIf((o) => o.type === EGroupChatType.GROUP)
  @IsNotEmpty({
    message: 'Tên nhóm chat không được để trống',
  })
  newName: string;
}

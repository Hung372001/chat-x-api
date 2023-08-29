import { PartialType } from '@nestjs/swagger';
import { AddMemberDto } from './add-member.dto';

export class RemoveMemberDto extends PartialType(AddMemberDto) {}

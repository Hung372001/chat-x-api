import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../common/services/base.service';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { GroupChat } from './entities/group-chat.entity';
import { RemoveMemberDto } from './dto/remove-member.dto';
import { different } from 'lodash';
import { Socket } from 'socket.io';
import { User } from '../user/entities/user.entity';

@Injectable()
export class GroupChatService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
  ) {
    super(groupChatRepo);
  }

  override async create(dto: CreateGroupChatDto): Promise<GroupChat> {
    try {
      const existedGroupName = await this.groupChatRepo.findOneBy({
        name: dto.name,
      });

      if (existedGroupName) {
        throw { message: 'Group name has already existed.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Members are not found.' };
      }

      return this.groupChatRepo.save({
        members: members,
        name: dto.name,
      } as unknown as GroupChat);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addMember(id: string, dto: AddMemberDto) {
    try {
      const foundGroupChat = await this.groupChatRepo.findOneBy({ id });
      if (foundGroupChat) {
        throw { message: 'Group chat is not found.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Members are not found.' };
      }

      return this.groupChatRepo.save({
        ...foundGroupChat,
        members: [...foundGroupChat.members, ...members],
      });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeMember(id: string, dto: RemoveMemberDto) {
    try {
      const foundGroupChat = await this.groupChatRepo.findOneBy({ id });
      if (foundGroupChat) {
        throw { message: 'Group chat is not found.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Members are not found.' };
      }

      // After remove members list
      const aRMembers = different(foundGroupChat.members, members);

      return this.groupChatRepo.save({
        ...foundGroupChat,
        members: aRMembers,
      });
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async getJoinedGroups(userId: string) {
    try {
      return this.groupChatRepo
        .createQueryBuilder('group-chat')
        .where('group-chat.members @> :memberIds::uuid[]', {
          memberIds: [userId],
        })
        .getMany();
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async emitOnlineGroupMember(client: Socket, member: User, joinGroup = true) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Join socket to all group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (joinGroup) {
            await client.join(group.name);
          }
          client.emit('member_online', {
            groupChat: group,
            member,
          });
        }),
      );
    }
  }

  async emitOfflineGroupMember(
    client: Socket,
    member: User,
    leaveGroup = true,
  ) {
    const groupChats = await this.getJoinedGroups(member.id);

    // Leave all joined group
    if (groupChats?.length > 0) {
      Promise.all(
        groupChats.map(async (group: GroupChat) => {
          if (leaveGroup) {
            await client.leave(group.name);
          }
          client.emit('member_offline', {
            groupChat: group,
            member: client.data?.user,
          });
        }),
      );
    }
  }
}

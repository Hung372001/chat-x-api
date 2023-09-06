import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { Socket } from 'socket.io';
import { User } from '../../user/entities/user.entity';
import { EGroupChatType } from '../../group-chat/dto/group-chat.enum';
import { AppGateway } from '../app.gateway';
import { UserService } from '../../user/user.service';

@Injectable()
export class GroupChatGatewayService extends BaseService<GroupChat> {
  constructor(
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @Inject(UserService) private userService: UserService,
  ) {
    super(groupChatRepo);
  }

  async findOne(
    query: FindOptionsWhere<GroupChat> | FindOptionsWhere<GroupChat>[],
  ): Promise<GroupChat | null> {
    return this.groupChatRepo.findOne({
      where: query,
      relations: ['members', 'admins'],
    });
  }

  async getGroupChatDou(memberIds: string[], gateway: AppGateway) {
    const groupChat = await this.groupChatRepo
      .createQueryBuilder('group_chat')
      .select('group_chat.id')
      .leftJoin('group_chat.members', 'user')
      .where('group_chat.type = :type', { type: EGroupChatType.DOU })
      .addGroupBy('group_chat.id')
      .having(`array_agg(user.id) @> :userIds::uuid[]`, {
        userIds: memberIds,
      })
      .getOne();

    if (!groupChat) {
      const members = await this.userService.findMany({
        where: { id: In(memberIds) },
      });
      if (members?.length === 2) {
        const newGroupChat = {
          members: members,
          type: EGroupChatType.DOU,
        } as unknown as GroupChat;

        await this.groupChatRepo.save(newGroupChat);

        // Call socket to create group chat
        await gateway.createGroupChat(newGroupChat);

        return newGroupChat;
      }

      return null;
    } else {
      return this.findOne({ id: groupChat.id });
    }
  }

  async getJoinedGroups(userId: string) {
    try {
      return this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.members', 'user', 'user.id = :userId', {
          userId,
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
            await client.join(group.id);
          }
          client.broadcast.to(group.id).emit('someoneOnline', {
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
            await client.leave(group.id);
          }
          client.broadcast.to(group.id).emit('someoneOffline', {
            groupChat: group,
            member,
          });
        }),
      );
    }
  }
}

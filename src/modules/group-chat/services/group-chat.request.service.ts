import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { AddMemberDto } from '../dto/add-member.dto';
import { CreateGroupChatDto } from '../dto/create-group-chat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { UserService } from '../../user/user.service';
import { GroupChat } from '../entities/group-chat.entity';
import { RemoveMemberDto } from '../dto/remove-member.dto';
import { differenceBy, intersectionBy, omitBy, isNull } from 'lodash';
import { User } from '../../user/entities/user.entity';
import { EGroupChatType } from '../dto/group-chat.enum';
import { FilterDto } from '../../../common/dto/filter.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AppGateway } from '../../gateway/app.gateway';
import { RenameGroupChatDto } from '../dto/rename-group-chat.dto';
import { GroupChatSetting } from '../entities/group-chat-setting.entity';
import { ERole } from '../../../common/enums/role.enum';
import moment from 'moment';
import { AddAdminDto } from '../dto/add-admin.dto';
import { RemoveAdminDto } from '../dto/remove-admin.dto';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatRequestService extends BaseService<GroupChat> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserService) private userService: UserService,
    @Inject(AppGateway) private readonly gateway: AppGateway,
  ) {
    super(groupChatRepo);
  }

  override async findAll(query: FilterDto) {
    const currentUser = this.request.user as User;
    const isRootAdmin = currentUser.roles[0].type === ERole.ADMIN;

    const {
      keyword = '',
      andKeyword = '',
      searchAndBy = '',
      searchBy = !query.searchBy && !query.searchAndBy
        ? ['name']
        : query.searchBy,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 10,
      page = 1,
      isGetAll = false,
    } = query;

    let groupChatIds = [];
    if (!isRootAdmin) {
      groupChatIds = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .select('group_chat.id')
        .leftJoin('group_chat.members', 'user')
        .addGroupBy('group_chat.id')
        .having(`array_agg(user.id) @> :userIds::uuid[]`, {
          userIds: [currentUser.id],
        })
        .getMany();

      if (!groupChatIds.length) {
        return {
          items: [],
          total: 0,
        };
      }
    }

    const queryBuilder = this.groupChatRepo
      .createQueryBuilder('group_chat')
      .leftJoinAndSelect('group_chat.members', 'user')
      .leftJoinAndSelect(
        'user.groupChatSettings',
        'group_chat_setting as userSetting',
      )
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('group_chat.owner', 'user as owners')
      .leftJoinAndSelect('group_chat.admins', 'user as admins')
      .leftJoinAndSelect('group_chat.latestMessage', 'chat_message')
      .leftJoinAndSelect('group_chat.settings', 'group_chat_setting')
      .where('group_chat_setting as userSetting.groupChatId = group_chat.id')
      .orderBy('group_chat_setting.pinned', 'DESC');

    if (!isRootAdmin) {
      queryBuilder
        .andWhere('group_chat.id In(:...groupChatIds)', {
          groupChatIds: groupChatIds.map((x) => x.id),
        })
        .andWhere('group_chat_setting.userId = :userId', {
          userId: currentUser.id,
        });
    } else {
      queryBuilder.withDeleted();
    }

    if (keyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`keyword_${index}`] = !Array.isArray(keyword)
            ? `%${keyword}%`
            : `%${keyword[index]}%`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `group_chat.${item}` : item
            } as text) ilike :keyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`keyword_${index}`] = !Array.isArray(keyword)
                ? `%${keyword}%`
                : `%${keyword[index]}%`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `group_chat.${item}` : item
                } as text) ilike :keyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    // search ilike
    if (andKeyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`andKeyword_${index}`] = !Array.isArray(andKeyword)
            ? `${andKeyword}`
            : `${andKeyword[index]}`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `group_chat.${item}` : item
            } as text) ilike :andKeyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`andKeyword_${index}`] = !Array.isArray(andKeyword)
                ? `${andKeyword}`
                : `${andKeyword[index]}`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `group_chat.${item}` : item
                } as text) ilike :andKeyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    const [items, total] = await queryBuilder
      .addOrderBy(
        sortBy.includes('.') ? sortBy : `group_chat.${sortBy}`,
        sortOrder,
      )
      .take(isGetAll ? null : limit)
      .skip(isGetAll ? null : (page - 1) * limit)
      .getManyAndCount();

    return {
      items: items.map((iterator) =>
        iterator.type === EGroupChatType.GROUP
          ? omitBy(
              {
                ...iterator,
                isAdmin: iterator.admins.some((x) => x.id === currentUser.id),
                isOwner: !!iterator.owner,
                admins: !!iterator.owner ? iterator.admins : null,
                owner: null,
              },
              isNull,
            )
          : omitBy(
              {
                ...iterator,
                admins: null,
                owner: null,
              },
              isNull,
            ),
      ),
      total,
    };
  }

  override async findById(id: string): Promise<GroupChat> {
    const currentUser = this.request.user as User;
    try {
      const groupChat = await this.groupChatRepo.findOne({
        where: { id },
        relations: ['members'],
      });

      if (
        !groupChat ||
        !groupChat.members.some((x) => x.id === currentUser.id)
      ) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  override async create(dto: CreateGroupChatDto): Promise<GroupChat> {
    try {
      const currentUser = this.request.user as User;

      if (!dto.members.some((x) => x === currentUser.id)) {
        throw { message: 'Bạn không có quyền tạo nhóm chat.' };
      }

      if (dto.type === EGroupChatType.GROUP) {
        const existedGroupName = await this.groupChatRepo.findOneBy({
          name: dto.name,
        });

        if (existedGroupName) {
          throw { message: 'Tên nhóm đã tồn tại.' };
        }

        if (dto.members.length <= 2) {
          throw { message: 'Số thành viên không hợp lệ.' };
        }
      }

      if (dto.type === EGroupChatType.DOU) {
        if (dto.members.length !== 2) {
          throw { message: 'Số thành viên không hợp lệ.' };
        }

        const existedGroupChat = await this.groupChatRepo
          .createQueryBuilder('group_chat')
          .select('group_chat.id')
          .leftJoin('group_chat.members', 'user')
          .where('group_chat.type = :type', { type: EGroupChatType.DOU })
          .addGroupBy('group_chat.id')
          .having(`array_agg(user.id) @> :userIds::uuid[]`, {
            userIds: dto.members,
          })
          .getOne();

        if (existedGroupChat) {
          throw { message: 'Hội thoại đã tồn tại.' };
        }
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
        relations: ['profile'],
      });
      if (members?.length > 0 && dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      const newGroupChat = {
        members: members,
        name: dto.name,
        type: dto.type,
        admins: [currentUser],
        owner: dto.type === EGroupChatType.GROUP ? currentUser : null,
      } as unknown as GroupChat;

      await this.groupChatRepo.save(newGroupChat);

      // Create member setting
      const memberSettings = [];
      await Promise.all(
        members.map((member) => {
          memberSettings.push({
            groupChat: newGroupChat,
            user: member,
          });
        }),
      );

      await this.groupSettingRepo.save(memberSettings);

      // Call socket to create group chat
      await this.gateway.createGroupChat(newGroupChat);

      return newGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addMember(id: string, dto: AddMemberDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id },
        relations: ['admins', 'members', 'members.profile'],
      });
      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (!foundGroupChat.canAddFriends) {
        throw { message: 'Tính năng thêm thành viên cho nhóm đang bị khóa.' };
      }

      if (foundGroupChat.type === EGroupChatType.DOU) {
        throw { message: 'Vui lòng tạo nhóm chat để thêm thành viên.' };
      }

      if (!foundGroupChat.admins.some((x) => x.id === currentUser.id)) {
        throw { message: 'Bạn không có quyền thêm thành viên nhóm.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
        relations: ['profile'],
      });
      if (!members?.length || dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      const existedMembers = intersectionBy(
        foundGroupChat.members,
        members,
        'id',
      );

      if (existedMembers.length > 0) {
        throw {
          message: `${existedMembers
            .map((x) => x.username)
            .join(', ')} đã là thành viên của nhóm.`,
        };
      }

      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        members: [...foundGroupChat.members, ...members],
      });

      // Create member setting
      const memberSettings = [];
      await Promise.all(
        members.map((member) => {
          memberSettings.push({
            groupChat: foundGroupChat,
            user: member,
          });
        }),
      );
      await this.groupSettingRepo.save(memberSettings);

      // Call socket
      await this.gateway.addNewGroupMember(foundGroupChat, members);

      return res;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addAdmin(id: string, dto: AddAdminDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins', 'members', 'owner'],
      });

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (foundGroupChat.owner?.id !== currentUser.id) {
        throw { message: 'Chủ nhóm mới có quyền thêm quản trị viên.' };
      }

      const admins = await this.userService.findMany({
        where: { id: In(dto.admins) },
        relations: ['profile'],
      });
      if (!admins?.length || dto.admins.length !== admins.length) {
        throw { message: 'Không tìm thấy quản trị viên.' };
      }

      const notMembers = differenceBy(admins, foundGroupChat.members, 'id');
      if (notMembers.length > 0) {
        throw {
          message: `${notMembers
            .map((x) => x.username)
            .join(', ')} không phải thành viên nhóm.`,
        };
      }

      const existedMembers = intersectionBy(
        foundGroupChat.admins,
        admins,
        'id',
      );

      if (existedMembers.length > 0) {
        throw {
          message: `${existedMembers
            .map((x) => x.username)
            .join(', ')} đã là quản trị viên nhóm.`,
        };
      }

      foundGroupChat.admins = foundGroupChat.admins.concat(admins);
      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        admins: foundGroupChat.admins,
      });

      // Call socket to add new admin
      await this.gateway.addNewGroupAdmin(foundGroupChat, admins);

      return res;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeAdmin(id: string, dto: RemoveAdminDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins', 'members', 'owner'],
      });

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (foundGroupChat.owner?.id !== currentUser.id) {
        throw { message: 'Chủ nhóm mới có quyền xóa quản trị viên.' };
      }

      const admins = await this.userService.findMany({
        where: { id: In(dto.admins) },
        relations: ['profile'],
      });
      if (!admins?.length || dto.admins.length !== admins.length) {
        throw { message: 'Không tìm thấy quản trị viên.' };
      }

      const notMembers = differenceBy(admins, foundGroupChat.members, 'id');
      if (notMembers.length > 0) {
        throw {
          message: `${notMembers
            .map((x) => x.username)
            .join(', ')} không phải thành viên nhóm chat.`,
        };
      }

      const notAdmins = differenceBy(admins, foundGroupChat.admins, 'id');
      if (notAdmins.length > 0) {
        throw {
          message: `${notAdmins
            .map((x) => x.username)
            .join(', ')} không phải quản trị viên.`,
        };
      }

      const aRAdmins = differenceBy(foundGroupChat.members, admins, 'id');

      foundGroupChat.admins = aRAdmins;
      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        admins: foundGroupChat.admins,
      });

      // Call socket to remove admins
      await this.gateway.removeGroupAdmin(foundGroupChat, aRAdmins);

      return res;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async rename(id: string, dto: RenameGroupChatDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins'],
      });

      if (foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (!foundGroupChat.admins.some((x) => x.id === currentUser.id)) {
        throw { message: 'Bạn không có quyền đổi tên nhóm.' };
      }

      foundGroupChat.name = dto.newName;
      await this.groupChatRepo.update(foundGroupChat.id, {
        name: foundGroupChat.name,
      });

      // Call socket to create group chat
      await this.gateway.renameGroupChat(foundGroupChat, dto.newName);

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeMember(id: string, dto: RemoveMemberDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins', 'members', 'members.profile'],
      });

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (!foundGroupChat.admins.some((x) => x.id === currentUser.id)) {
        throw { message: 'Bạn không có quyền thêm thành viên nhóm.' };
      }

      const members = await this.userService.findMany({
        where: { id: In(dto.members) },
        relations: ['profile'],
      });
      if (!members?.length || dto.members.length !== members.length) {
        throw { message: 'Không tìm thấy thành viên nhóm.' };
      }

      const notMembers = differenceBy(members, foundGroupChat.members, 'id');
      if (notMembers.length > 0) {
        throw {
          message: `${notMembers
            .map((x) => x.username)
            .join(', ')} không phải thành viên của nhóm.`,
        };
      }

      // After remove members list
      const aRMembers = differenceBy(foundGroupChat.members, members, 'id');

      if (aRMembers.length > 0) {
        // Delete member setting
        const memberSettings = [];
        await Promise.all(
          aRMembers.map((member) => {
            memberSettings.push({
              groupChat: foundGroupChat,
              user: member,
            });
          }),
        );
        await this.groupSettingRepo.delete(memberSettings);
      }

      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        members: aRMembers,
      });

      // Call socket
      await this.gateway.removeGroupMember(foundGroupChat, members);

      return res;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeGroup(id: string) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id },
        relations: ['admins', 'members', 'members.profile', 'owner'],
      });

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (
        (foundGroupChat.type === EGroupChatType.GROUP &&
          foundGroupChat.owner.id !== currentUser.id) ||
        (foundGroupChat.type === EGroupChatType.DOU &&
          !foundGroupChat.members.some((x) => x.id === currentUser.id))
      ) {
        throw { message: 'Bạn không có quyền xóa nhóm.' };
      }

      await this.groupChatRepo.softDelete(id);
      foundGroupChat.deletedAt = moment.utc().toDate();

      // Call socket
      await this.gateway.removeGroupChat(foundGroupChat);

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

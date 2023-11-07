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
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Brackets, Connection, In, Repository } from 'typeorm';
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
import slugify from 'slugify';
import { Friendship } from '../../friend/entities/friendship.entity';
import { pick } from 'lodash';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatRequestService extends BaseService<GroupChat> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(GroupChat) private groupChatRepo: Repository<GroupChat>,
    @InjectRepository(Friendship)
    private friendShipRepo: Repository<Friendship>,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(UserService) private userService: UserService,
    @Inject(AppGateway) private readonly gateway: AppGateway,
    @InjectConnection() private readonly connection: Connection,
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
      sortOrder = 'DESC',
      limit = 10,
      page = 1,
      isGetAll = false,
    } = query;

    let { sortBy = 'createdAt' } = query;

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

      if (!groupChatIds.length && !keyword && !andKeyword) {
        return {
          items: [],
          total: 0,
        };
      }
    }

    if (sortBy === 'chat_message as latestMessages.createdAt') {
      sortBy = 'updatedAt';
    }

    const queryBuilder = this.groupChatRepo
      .createQueryBuilder('group_chat')
      .leftJoinAndSelect('group_chat.owner', 'user as owners')
      .leftJoinAndSelect('group_chat.admins', 'user as admins')
      .leftJoinAndSelect(
        'group_chat.latestMessage',
        'chat_message as latestMessages',
      )
      .leftJoinAndSelect(
        'chat_message as latestMessages.nameCard',
        'user as nameCards',
      )
      .leftJoinAndSelect('group_chat.settings', 'group_chat_setting')
      .andWhere('group_chat_setting.groupChatId = group_chat.id')
      .orderBy('group_chat_setting.pinned', 'DESC');

    if (!isRootAdmin) {
      queryBuilder.andWhere(
        new Brackets((subQuery) => {
          if (groupChatIds?.length) {
            subQuery.where(
              new Brackets((andSubQuery) => {
                andSubQuery.where('group_chat.id In(:...groupChatIds)', {
                  groupChatIds: groupChatIds.map((x) => x.id),
                });
                andSubQuery.andWhere('group_chat_setting.userId = :userId', {
                  userId: currentUser.id,
                });
              }),
            );
          }

          const searchNameIndex = searchBy?.indexOf('name') ?? -1;
          const andSearchNameIndex = searchAndBy?.indexOf('name') ?? -1;
          if (
            (searchNameIndex !== -1 || andSearchNameIndex !== -1) &&
            (keyword ||
              andKeyword ||
              keyword[searchNameIndex] ||
              andKeyword[andSearchNameIndex])
          ) {
            subQuery.orWhere('group_chat.isPublic = true');
          }
        }),
      );
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
      items: await Promise.all(
        items.map(async (iterator) => {
          return await this.mappingGroup(iterator, currentUser);
        }),
      ),
      total,
    };
  }

  async getAllMember(id: string, query: FilterDto) {
    const currentUser = this.request.user as User;
    const { limit = 10, page = 1, isGetAll = false } = query;

    const members = await this.connection.query(
      `
            SELECT *
            FROM "group_chat_members_user"
            LEFT JOIN "user" ON "user"."id" = "group_chat_members_user"."userId"
            LEFT JOIN "profile" ON "profile"."id" = "user"."profileId"
            WHERE "group_chat_members_user"."groupChatId" = '${id}'
            ORDER BY "user"."username" ASC
            ${isGetAll ? '' : `LIMIT ${limit}`}
            ${isGetAll ? '' : `OFFSET ${(page - 1) * limit}`}
          `,
    );

    let mappingMembers = members;
    if (members.length > 0) {
      mappingMembers = await Promise.all(
        members.map(async (member) => {
          const friendship = await this.friendShipRepo
            .createQueryBuilder('friendship')
            .where('friendship.fromUserId = :fromUserId', {
              fromUserId: currentUser.id,
            })
            .andWhere('friendship.toUserId = :toUserId', {
              toUserId: member.userId,
            })
            .getOne();

          member['nickname'] = '';
          member['profile'] = {
            id: member.profileId,
            avatar: member.avatar,
            gender: member.gender,
          };
          member.id = member.userId;
          member['isActive'] = member.is_active;
          member['createdAt'] = member.created_at;
          member['updatedAt'] = member.updated_at;
          member['deletedAt'] = member.deleted_at;
          member = pick(member, [
            'id',
            'email',
            'phoneNumber',
            'username',
            'hiding',
            'soundNotification',
            'nickname',
            'profile',
            'isActive',
            'createdAt',
            'updatedAt',
            'deletedAt',
          ]);
          if (friendship) {
            member['nickname'] = friendship.nickname;
          }

          return member;
        }),
      );
    }

    const countRes = await this.connection.query(
      `
            SELECT COUNT(*)
            FROM "group_chat_members_user"
            WHERE "group_chat_members_user"."groupChatId" = '${id}'
          `,
    );

    return {
      items: mappingMembers,
      total: countRes?.length ? +countRes[0]?.count ?? 0 : 0,
    };
  }

  override async findById(id: string): Promise<GroupChat> {
    const currentUser = this.request.user as User;
    const isRootAdmin = currentUser.roles[0].type === ERole.ADMIN;

    try {
      const groupChat = await this.groupChatRepo
        .createQueryBuilder('group_chat')
        .leftJoinAndSelect('group_chat.members', 'user')
        .leftJoinAndSelect('user.friends', 'friendship')
        .leftJoinAndSelect('friendship.fromUser', 'user as friends')
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
        .andWhere('group_chat.id = :groupChatId', { groupChatId: id })
        .andWhere('group_chat_setting.userId = :userId', {
          userId: currentUser.id,
        })
        .orderBy('group_chat_setting.pinned', 'DESC')
        .getOne();

      if (
        !isRootAdmin &&
        (!groupChat || !groupChat.members.some((x) => x.id === currentUser.id))
      ) {
        return null;
      }

      return this.mappingGroup(groupChat, currentUser);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findConversation(userId: string): Promise<GroupChat> {
    const currentUser = this.request.user as User;
    const memberIds = [currentUser.id, userId];

    try {
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
        throw new HttpException(
          'Không tìm thấy cuộc hội thoại',
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.findById(groupChat.id);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async mappingGroup(groupChat: GroupChat, currentUser: User) {
    const { items: members, total } = await this.getAllMember(groupChat.id, {
      limit: 3,
      page: 1,
    } as FilterDto);
    return omitBy(
      groupChat.type === EGroupChatType.GROUP
        ? {
            ...groupChat,
            isAdmin:
              groupChat.admins?.some((x) => x.id === currentUser.id) ?? false,
            isOwner: groupChat.owner?.id === currentUser.id ?? false,
            admins:
              groupChat.owner?.id === currentUser.id ? groupChat.admins : null,
            owner: null,
            members,
            latestMessage:
              groupChat?.settings?.length &&
              moment(groupChat.latestMessage?.createdAt).isBefore(
                moment(groupChat?.settings[0]?.deleteMessageFrom),
              )
                ? null
                : groupChat?.latestMessage,
            memberQty: total ?? 0,
          }
        : {
            ...groupChat,
            admins: null,
            owner: null,
            members,
            latestMessage:
              groupChat?.settings?.length &&
              moment(groupChat.latestMessage?.createdAt).isBefore(
                moment(groupChat?.settings[0]?.deleteMessageFrom),
              )
                ? null
                : groupChat?.latestMessage,
            memberQty: total ?? 0,
          },
      isNull,
    );
  }

  mappingFriendship(members: any[], currentUser: User) {
    return members.map((member) => ({
      ...member,
      nickname:
        member.friends?.find((x) => x.fromUser?.id === currentUser.id)
          ?.nickname ?? '',
      friends: null,
    }));
  }

  override async create(dto: CreateGroupChatDto): Promise<GroupChat> {
    try {
      const currentUser = this.request.user as User;

      if (!dto.members.some((x) => x === currentUser.id)) {
        throw { message: 'Bạn không có quyền tạo nhóm chat.' };
      }

      if (dto.type === EGroupChatType.GROUP) {
        const existedGroupName = await this.groupChatRepo
          .createQueryBuilder('group_chat')
          .where(`LOWER(name) = :groupName`, {
            groupName: dto.name.toLowerCase(),
          })
          .andWhere(`group_chat.ownerId = :userId`, { userId: currentUser.id })
          .getOne();

        if (existedGroupName) {
          throw {
            message: `${currentUser.username} đã đặt tên này cho 1 nhóm khác, vui lòng chọn tên khác.`,
          };
        }

        if (dto.members.length < 2) {
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

      let uniqueName = null;
      if (dto.name) {
        uniqueName = `@${slugify(dto.name, '_')}`;
        const existedGroupNameCount = await this.groupChatRepo
          .createQueryBuilder('group_chat')
          .where(`LOWER(name) = :groupName`, {
            groupName: dto.name.toLowerCase(),
          })
          .getCount();

        if (existedGroupNameCount) {
          uniqueName += `_${+existedGroupNameCount}`;
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
        uniqueName,
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
        where: { id: In(dto.members), isActive: true },
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

      foundGroupChat.members = [...foundGroupChat.members, ...members];
      const res = await this.groupChatRepo.save(foundGroupChat);

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

  async modifyAdmin(id: string, dto: AddAdminDto) {
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

      if (admins.length === foundGroupChat.admins.length) {
        const changedAdmins = differenceBy(admins, foundGroupChat.admins, 'id');

        if (!changedAdmins.length) {
          throw {
            message: `Danh sách quản trị viên không thay đổi.`,
          };
        }
      }

      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        admins,
      });

      // Call socket to add new admin
      await this.gateway.modifyGroupAdmin(foundGroupChat, admins);

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

  async leaveGroup(id: string) {
    const currentUser = this.request.user as User;

    try {
      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins', 'members', 'members.profile', 'owner'],
      });

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (!foundGroupChat.members.some((x) => x.id === currentUser.id)) {
        throw { message: 'Bạn không phải thành viên nhóm chat.' };
      }

      // After remove members list
      const aRMembers = differenceBy(
        foundGroupChat.members,
        [currentUser],
        'id',
      );

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

      // Admin group leaved
      if (foundGroupChat.admins.some((x) => x.id === currentUser.id)) {
        foundGroupChat.admins = differenceBy(
          foundGroupChat.admins,
          [currentUser],
          'id',
        );
      }

      foundGroupChat.members = aRMembers;
      const res = await this.groupChatRepo.save(foundGroupChat);

      // Call socket
      await this.gateway.removeGroupMember(foundGroupChat, [currentUser]);

      // Remove group if user is owner
      if (foundGroupChat.owner.id === currentUser.id) {
        await this.removeGroup(foundGroupChat.id);
      }

      return res;
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
        throw { message: 'Bạn không có quyền xóa thành viên nhóm.' };
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

      foundGroupChat.members = aRMembers;
      const res = await this.groupChatRepo.save(foundGroupChat);

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

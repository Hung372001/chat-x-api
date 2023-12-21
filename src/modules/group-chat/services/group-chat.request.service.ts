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
import {
  differenceBy,
  intersectionBy,
  omitBy,
  isNull,
  pick,
  uniqBy,
} from 'lodash';
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
import { CacheService } from '../../cache/cache.service';
import { GroupChatService } from './group-chat.service';
import { SendMessageDto } from '../../chat-message/dto/send-message.dto';
import { AuthSocket } from '../../gateway/interfaces/auth.interface';
import { ClientProxy } from '@nestjs/microservices';
import { GetAllGroupChatDto } from '../dto/get-all-group-chat.dto';

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
    @Inject(GroupChatService)
    private readonly groupChatService: GroupChatService,
    @Inject(CacheService) private readonly cacheService: CacheService,
    @InjectConnection() private readonly connection: Connection,
    @Inject('CHAT_GATEWAY') private rmqClient: ClientProxy,
  ) {
    super(groupChatRepo);
  }

  override async findAll(query: GetAllGroupChatDto) {
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
      page = 1,
      limit = 10,
      isGetAll = false,
      unReadGroups = false,
    } = query;

    return this.cacheService.cacheServiceFunc(
      `GetAllGroupChat_${currentUser.id}_${JSON.stringify(query)}`,
      async () => {
        let { sortBy = 'createdAt' } = query;

        let groupChatIds = [];
        const searchNameIndex = searchBy?.indexOf('name') ?? -1;
        const andSearchNameIndex = searchAndBy?.indexOf('name') ?? -1;

        if (!isRootAdmin) {
          const cacheKey = `GroupChatIds_${currentUser.id}`;
          groupChatIds = await this.cacheService.get(cacheKey);

          if (!groupChatIds?.length) {
            groupChatIds = await this.connection.query(`
          select distinct "groupChatId"
          from "group_chat_members_user"
          where "userId" = '${currentUser.id}'
        `);

            if (
              !groupChatIds?.length &&
              ((!keyword && !andKeyword) ||
                (searchNameIndex === -1 && andSearchNameIndex === -1))
            ) {
              return {
                items: [],
                total: 0,
              };
            } else {
              groupChatIds = groupChatIds.map((x) => x.groupChatId);
              this.cacheService.set(cacheKey, groupChatIds);
            }
          }
        }

        if (sortBy === 'chat_message as latestMessages.createdAt') {
          sortBy = 'updatedAt';
        }

        const queryBuilder = this.groupChatRepo
          .createQueryBuilder('group_chat')
          .leftJoinAndSelect('group_chat.settings', 'group_chat_setting')
          .andWhere('group_chat_setting.groupChatId = group_chat.id')
          .orderBy('group_chat_setting.pinned', 'DESC');

        if (!!unReadGroups) {
          queryBuilder.andWhere('group_chat_setting.unReadMessages > 0');
        }

        if (!isRootAdmin) {
          const getPublic =
            (searchNameIndex !== -1 || andSearchNameIndex !== -1) &&
            (keyword ||
              andKeyword ||
              keyword[searchNameIndex] ||
              andKeyword[andSearchNameIndex]);
          queryBuilder
            .andWhere(
              `(group_chat.id In(:...groupChatIds) AND group_chat_setting.userId = :userId) ${
                getPublic ? 'OR ${group_chat.isPublic = true}' : ''
              }`,
            )
            .setParameters({
              groupChatIds,
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
                  whereParams[`andKeyword_${index}`] = !Array.isArray(
                    andKeyword,
                  )
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

        const res = {
          items: await Promise.all(
            items.map(async (iterator) => {
              return await this.mappingGroup(iterator, currentUser);
            }),
          ),
          total,
        };

        return res;
      },
    );
  }

  async getAllMember(id: string, query: FilterDto) {
    const currentUser = this.request.user as User;
    const { limit = 10, page = 1, isGetAll = false } = query;

    const cacheKey = `GroupMember_${id}_${JSON.stringify(query)}`;
    const cacheData = await this.cacheService.get(cacheKey);

    if (cacheData) {
      return cacheData;
    }

    const members = await this.connection.query(
      `
            SELECT *
            FROM "group_chat_members_user"
            LEFT JOIN "user" ON "user"."id" = "group_chat_members_user"."userId"
            LEFT JOIN "profile" ON "profile"."id" = "user"."profileId"
            WHERE "group_chat_members_user"."groupChatId" = '${id}'
            AND "user"."deleted_at" IS NULL
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

    const resData = {
      items: mappingMembers,
      total: countRes?.length ? +countRes[0]?.count ?? 0 : 0,
    };

    await this.cacheService.set(cacheKey, resData);

    return resData;
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

    groupChat.latestMessage = await this.groupChatService.getLatestMessage(
      groupChat.id,
    );

    if (groupChat.type === EGroupChatType.GROUP) {
      const owner = await this.groupChatService.getGroupOwner(groupChat.id);
      const admins = await this.groupChatService.getGroupAdmins(groupChat.id);
      return omitBy(
        {
          ...groupChat,
          isAdmin: admins?.some((x) => x.id === currentUser.id) ?? false,
          isOwner: owner?.id === currentUser.id ?? false,
          admins: owner?.id === currentUser.id ? admins : null,
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
    } else {
      return omitBy(
        {
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
      await this.rmqClient.emit('createGroupChat', { newGroupChat });

      return newGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async addMember(id: string, dto: AddMemberDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatService.findOneWithMemberIds(
        id,
      );

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      if (!foundGroupChat.canAddFriends) {
        throw { message: 'Tính năng thêm thành viên cho nhóm đang bị khóa.' };
      }

      if (foundGroupChat.type === EGroupChatType.DOU) {
        throw { message: 'Vui lòng tạo nhóm chat để thêm thành viên.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        id,
        currentUser.id,
      );
      if (!isAdmin) {
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
        members,
        foundGroupChat.members,
        'id',
      );

      if (existedMembers.length > 0) {
        throw {
          message: `${existedMembers
            .map((x) => x.username)
            .join(', ')} đã là thành viên của nhóm.`,
        };
      }

      foundGroupChat.members = uniqBy(
        [...foundGroupChat.members, ...members],
        'id',
      );
      await this.createGroupChatMembers(foundGroupChat, members);

      // Create member setting
      const memberSettings = [];
      await Promise.all(
        members.map((member) => {
          memberSettings.push({
            groupChat: { id: foundGroupChat.id },
            user: { id: member.id },
          });
        }),
      );
      await this.groupSettingRepo.save(memberSettings);

      // Call socket
      await this.rmqClient.emit('addNewMember', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
            members: null,
          },
          isNull,
        ),
        members,
      });

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async modifyAdmin(id: string, dto: AddAdminDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatService.findOneWithMemberIds(
        id,
      );

      if (!foundGroupChat && foundGroupChat.type === EGroupChatType.GROUP) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const owner = await this.groupChatService.getGroupOwner(id);

      // Remove group if user is owner
      if (owner?.id !== currentUser.id) {
        throw { message: 'Chủ nhóm mới có quyền thêm quản trị viên.' };
      }

      foundGroupChat.admins = await this.groupChatService.getGroupAdmins(id);

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

      // Modify
      const res = await this.groupChatRepo.save({
        ...foundGroupChat,
        admins,
      });

      await this.cacheService.del(`GroupChatAdmins_${foundGroupChat.id}`);

      // Call socket to add new admin
      await this.rmqClient.emit('modifyAdmin', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
            members: null,
          },
          isNull,
        ),
        admins,
      });

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
      await this.rmqClient.emit('renameGroup', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
          },
          isNull,
        ),
        newName: dto.newName,
      });

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteGroupSettings(groupChatId: string, members: any[]) {
    if (members?.length) {
      await this.groupSettingRepo
        .createQueryBuilder('group_chat_setting')
        .delete()
        .where('groupChatId = :groupChatId', { groupChatId })
        .andWhere('userId IN (:...userIds)', {
          userIds: members.map((x) => x.id),
        })
        .execute();
    }
  }

  async removeGroupMemberData(foundGroupChat, members) {
    // Delete group settings
    await this.deleteGroupSettings(foundGroupChat.id, members);

    const arrMemberIds = members.map((x) => x.id).join("','");
    // Delete group admins
    await this.connection.query(`
     delete from "group_chat_admins_user" where "groupChatId" = '${foundGroupChat.id}' and "userId" IN ('${arrMemberIds}')
   `);

    // Delete group members
    await this.connection.query(`
       delete from "group_chat_members_user" where "groupChatId" = '${foundGroupChat.id}' and "userId" IN ('${arrMemberIds}')
     `);
  }

  async createGroupChatMembers(foundGroupChat, members) {
    if (members?.length) {
      const insertValues = members
        .map((member) => `('${foundGroupChat.id}', '${member.id}')`)
        .join(',');
      await this.connection.query(`
       insert into "group_chat_members_user" ("groupChatId", "userId") values ${insertValues} on conflict do nothing;
     `);
    }
  }

  async leaveGroup(id: string) {
    const currentUser = this.request.user as User;

    try {
      const owner = await this.groupChatService.getGroupOwner(id);

      // Remove group if user is owner
      if (owner?.id === currentUser.id) {
        return await this.removeGroup(id);
      }

      const foundGroupChat = await this.groupChatRepo.findOne({
        where: { id, type: EGroupChatType.GROUP },
        relations: ['admins', 'members'],
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

      await this.deleteGroupSettings(foundGroupChat.id, [currentUser]);

      // Remove members data
      await this.removeGroupMemberData(foundGroupChat, [currentUser]);

      foundGroupChat.members = aRMembers;

      // Call socket
      await this.rmqClient.emit('removeMember', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
            members: null,
          },
          isNull,
        ),
        members: [currentUser],
      });

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeMember(id: string, dto: RemoveMemberDto) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatService.findOneWithMemberIds(
        id,
      );

      if (!foundGroupChat && foundGroupChat.type === EGroupChatType.GROUP) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        id,
        currentUser.id,
      );
      if (!isAdmin) {
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

      // Remove members data
      await this.removeGroupMemberData(foundGroupChat, members);

      foundGroupChat.members = aRMembers;

      // Call socket
      await this.rmqClient.emit('removeMember', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
            members: null,
          },
          isNull,
        ),
        members,
      });

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async removeGroup(id: string) {
    try {
      const currentUser = this.request.user as User;

      const foundGroupChat = await this.groupChatService.findOneWithMemberIds(
        id,
      );

      if (!foundGroupChat) {
        throw { message: 'Không tìm thấy nhóm chat.' };
      }

      const owner = await this.groupChatService.getGroupOwner(id);

      if (
        (foundGroupChat.type === EGroupChatType.GROUP &&
          owner.id !== currentUser.id) ||
        (foundGroupChat.type === EGroupChatType.DOU &&
          !foundGroupChat.members.some((x) => x.id === currentUser.id))
      ) {
        throw { message: 'Bạn không có quyền xóa nhóm.' };
      }

      await this.groupChatRepo.softDelete(id);
      foundGroupChat.deletedAt = moment.utc().toDate();

      await this.deleteGroupSettings(foundGroupChat.id, foundGroupChat.members);

      // Remove members data
      await this.removeGroupMemberData(foundGroupChat, foundGroupChat.members);

      // Call socket
      await this.rmqClient.emit('removeGroupChat', {
        foundGroupChat: omitBy(
          {
            ...foundGroupChat,
            admins: null,
          },
          isNull,
        ),
      });

      return foundGroupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async offline() {
    const currentUser = this.request.user as User;
    await this.rmqClient.emit('offline', { currentUser });
    return true;
  }

  async sendMessage(createMessageDto: SendMessageDto) {
    const currentUser = this.request.user as User;
    this.gateway.onSendMessage(createMessageDto, {
      user: currentUser,
    } as AuthSocket);
  }
}

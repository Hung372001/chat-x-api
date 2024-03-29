import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from '@nestjs/common';
import { BaseService } from '../../../common/services/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AppGateway } from '../../gateway/app.gateway';
import { GroupChatSetting } from '../entities/group-chat-setting.entity';
import moment from 'moment';
import { GroupChatService } from './group-chat.service';
import { UpdateClearMessageDurationDto } from '../dto/update-clear-message-duration.dto';
import { CacheService } from '../../cache/cache.service';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatSettingRequestService extends BaseService<GroupChatSetting> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @Inject(GroupChatService)
    private groupChatService: GroupChatService,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(CacheService) private readonly cacheService: CacheService,
  ) {
    super(groupSettingRepo);
  }

  async getGroupSetting(groupChatId: string, userId: string) {
    try {
      const setting = await this.groupSettingRepo
        .createQueryBuilder('group_chat_setting')
        .where('group_chat_setting.groupChatId = :groupChatId', { groupChatId })
        .andWhere('group_chat_setting.userId = :userId', { userId })
        .getOne();

      if (!setting) {
        throw { message: 'Không tìm thấy thiết lập nhóm.' };
      }

      return {
        ...setting,
        userId: userId,
        groupId: groupChatId,
      };
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(groupChatId: string) {
    const currentUser = this.request.user as User;
    return this.getGroupSetting(groupChatId, currentUser.id);
  }

  async clearHistory(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      setting.deleteMessageFrom = moment.utc().toDate();
      await this.groupSettingRepo.update(setting.id, {
        deleteMessageFrom: setting.deleteMessageFrom,
      });

      await this.cacheService.del(
        `GroupSetting_${currentUser.id}_${groupChatId}`,
      );

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async togglePinGroupChat(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      setting.pinned = !setting.pinned;
      await this.groupSettingRepo.update(setting.id, {
        pinned: setting.pinned,
      });

      await this.cacheService.del(
        `GroupSetting_${currentUser.id}_${groupChatId}`,
      );

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleMuteNotification(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      setting.muteNotification = !setting.muteNotification;
      await this.groupSettingRepo.update(setting.id, {
        muteNotification: setting.muteNotification,
      });

      await this.cacheService.del(
        `GroupSetting_${currentUser.id}_${groupChatId}`,
      );

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleAddFriends(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const groupChat = await this.groupChatService.findOne({
        id: groupChatId,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy thông tin nhóm chat.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        groupChatId,
        currentUser.id,
      );
      if (!isAdmin) {
        throw {
          message: 'Chỉ quản trị viên mới có quyền thực hiện tính năng này.',
        };
      }

      groupChat.canAddFriends = !groupChat.canAddFriends;
      await this.groupChatService.update(groupChat.id, {
        canAddFriends: groupChat.canAddFriends,
      });

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleChatFeature(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const groupChat = await this.groupChatService.findOne({
        id: groupChatId,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy thông tin nhóm chat.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        groupChatId,
        currentUser.id,
      );
      if (!isAdmin) {
        throw {
          message: 'Chỉ quản trị viên mới có quyền thực hiện tính năng này.',
        };
      }

      groupChat.enabledChat = !groupChat.enabledChat;
      await this.groupChatService.update(groupChat.id, {
        enabledChat: groupChat.enabledChat,
      });

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async setClearHistorySequence(
    groupChatId: string,
    dto: UpdateClearMessageDurationDto,
  ) {
    try {
      const currentUser = this.request.user as User;

      const groupChat = await this.groupChatService.findOne({
        id: groupChatId,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy thông tin nhóm chat.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        groupChatId,
        currentUser.id,
      );
      if (!isAdmin) {
        throw {
          message: 'Chỉ quản trị viên mới có quyền thực hiện tính năng này.',
        };
      }

      groupChat.clearMessageDuration = dto.duration;
      await this.groupChatService.update(groupChat.id, {
        clearMessageDuration: groupChat.clearMessageDuration,
      });

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleGroupType(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const groupChat = await this.groupChatService.findOne({
        id: groupChatId,
      });

      if (!groupChat) {
        throw { message: 'Không tìm thấy thông tin nhóm chat.' };
      }

      const isAdmin = await this.groupChatService.isGroupAdmin(
        groupChatId,
        currentUser.id,
      );
      if (!isAdmin) {
        throw {
          message: 'Chỉ quản trị viên mới có quyền thực hiện tính năng này.',
        };
      }

      groupChat.isPublic = !groupChat.isPublic;
      await this.groupChatService.update(groupChat.id, {
        isPublic: groupChat.isPublic,
      });

      return groupChat;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleHideGroupChat(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      setting.hiding = !setting.hiding;
      await this.groupSettingRepo.update(setting.id, {
        hiding: setting.hiding,
      });

      await this.cacheService.del(
        `GroupSetting_${currentUser.id}_${groupChatId}`,
      );

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

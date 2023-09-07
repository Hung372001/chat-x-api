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
import { UpdateNicknameDto } from '../dto/update-nickname.dto';
import moment from 'moment';

@Injectable({ scope: Scope.REQUEST })
export class GroupChatSettingRequestService extends BaseService<GroupChatSetting> {
  constructor(
    @Inject(REQUEST) private request: Request,
    @InjectRepository(GroupChatSetting)
    private groupSettingRepo: Repository<GroupChatSetting>,
    @Inject(AppGateway) private readonly gateway: AppGateway,
  ) {
    super(groupSettingRepo);
  }

  async getGroupSetting(groupChatId: string, userId: string) {
    try {
      const setting = await this.groupSettingRepo
        .createQueryBuilder('group_chat_setting')
        .leftJoin('group_chat_setting.groupChat', 'group_chat')
        .leftJoin('group_chat_setting.user', 'user')
        .where('group_chat.id = :groupChatId', { groupChatId })
        .andWhere('user.id = :userId', { userId })
        .getOne();

      if (!setting) {
        throw { message: 'Không tìm thấy thiết lập nhóm.' };
      }

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async findOne(groupChatId: string) {
    const currentUser = this.request.user as User;
    return this.getGroupSetting(groupChatId, currentUser.id);
  }

  async updateNickname(groupChatId: string, dto: UpdateNicknameDto) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      const existedSetting = await this.groupSettingRepo.findOneBy({
        id: Not(currentUser.id),
        nickname: dto.nickname,
      });

      if (existedSetting) {
        throw { message: 'Biệt danh đã tồn tại.' };
      }

      setting.nickname = dto.nickname;
      await this.groupSettingRepo.update(setting.id, {
        nickname: setting.nickname,
      });

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async clearHistory(groupChatId: string) {
    try {
      const currentUser = this.request.user as User;

      const setting = await this.getGroupSetting(groupChatId, currentUser.id);

      setting.deleteMessageFrom = moment.utc().toDate();
      await this.groupSettingRepo.update(setting.id, {
        deleteMessageFrom: setting.deleteMessageFrom,
      });

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

      return setting;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

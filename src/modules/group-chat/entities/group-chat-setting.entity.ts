import { Column, Entity, JoinTable, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GroupChat } from './group-chat.entity';

@Entity()
export class GroupChatSetting extends BaseEntity {
  @ManyToOne(() => GroupChat, (groupChat) => groupChat.settings)
  @JoinTable()
  groupChat: GroupChat;

  @ManyToOne(() => User, (user) => user.groupChatSettings)
  @JoinTable()
  user: User;

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: false })
  hiding: boolean;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  deleteMessageFrom: Date;

  @Column({ default: false })
  muteNotification: boolean;

  @Column({ default: 0 })
  unReadMessages: number;
}

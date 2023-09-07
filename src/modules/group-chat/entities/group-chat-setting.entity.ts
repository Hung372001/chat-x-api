import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { GroupChat } from './group-chat.entity';

@Entity()
export class GroupChatSetting extends BaseEntity {
  @Column({ nullable: true })
  nickname: string;

  @OneToOne(() => GroupChat)
  @JoinColumn()
  groupChat: GroupChat;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column({ default: false })
  pinned: boolean;

  @Column({
    type: 'timestamptz',
  })
  deleteMessageFrom: Date;

  @Column({ default: false })
  muteNotification: boolean;
}

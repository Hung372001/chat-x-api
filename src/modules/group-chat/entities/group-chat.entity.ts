import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { EGroupChatType } from '../dto/group-chat.enum';
import { GroupChatSetting } from './group-chat-setting.entity';

@Entity()
export class GroupChat extends BaseEntity {
  @ManyToMany(() => User)
  @JoinTable()
  members: User[];

  @Column({ nullable: true })
  name: string;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.group)
  @JoinTable()
  chatMessages: ChatMessage[];

  @OneToOne(() => ChatMessage, (message) => message.id)
  @JoinColumn()
  latestMessage: ChatMessage;

  @ManyToMany(() => User)
  @JoinTable()
  admins: User[];

  @OneToOne(() => ChatMessage, (message) => message.id)
  @JoinColumn()
  owner: User;

  @Column({
    type: 'enum',
    enum: EGroupChatType,
  })
  type: EGroupChatType;

  @OneToMany(() => GroupChatSetting, (settings) => settings.groupChat)
  settings: GroupChatSetting[];

  // General setting
  @Column({ nullable: true, default: true })
  canAddFriend: boolean;

  @Column({ nullable: true, default: true })
  canChat: boolean;

  @Column({ type: 'decimal', default: 0 })
  clearMessageDuration: number;
}

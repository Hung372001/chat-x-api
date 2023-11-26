import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { EGroupChatType } from '../dto/group-chat.enum';
import { GroupChatSetting } from './group-chat-setting.entity';
import { AllChatMessage } from '../../chat-message/entities/all-chat-message.entity';

@Entity()
export class GroupChat extends BaseEntity {
  @ManyToMany(() => User)
  @JoinTable()
  members: User[];

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  uniqueName: string;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.group)
  @JoinTable()
  chatMessages: ChatMessage[];

  @OneToMany(() => AllChatMessage, (allChatMessages) => allChatMessages.group)
  @JoinTable()
  allChatMessages: AllChatMessage[];

  @OneToOne(() => ChatMessage, (message) => message.id)
  @JoinColumn()
  latestMessage: ChatMessage;

  @ManyToMany(() => User)
  @JoinTable()
  admins: User[];

  @ManyToOne(() => User, (owner) => owner.ownGroups)
  @JoinTable()
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
  canAddFriends: boolean;

  @Column({ nullable: true, default: true })
  enabledChat: boolean;

  @Column({ type: 'decimal', default: 0 })
  clearMessageDuration: number;

  @Column({ nullable: true, default: false })
  isPublic: boolean;
}

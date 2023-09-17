import {
  Entity,
  Column,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity()
export class ChatMessage extends BaseEntity {
  @Column({ nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  imageUrls: string[];

  @Column({ type: 'jsonb', nullable: true })
  documentUrls: string[];

  @ManyToOne(() => User, (user) => user.chatMessages)
  @JoinTable()
  sender: User;

  @ManyToOne(() => GroupChat, (group) => group.chatMessages)
  @JoinTable()
  group: GroupChat;

  @Column({ default: false })
  isRead: boolean;

  @ManyToMany(() => User)
  @JoinTable()
  readsBy: User[];

  @ManyToOne(() => User, (deletedBy) => deletedBy.deletedMessages)
  @JoinTable()
  deletedBy: User;

  @Column({ default: false })
  unsent: boolean;

  @ManyToOne(() => User, (unsentBy) => unsentBy.unsentMessages)
  @JoinColumn()
  unsentBy: User;

  @Column({ default: false })
  pinned: boolean;

  @ManyToOne(() => User, (pinnedBy) => pinnedBy.pinnedMessages)
  @JoinColumn()
  pinnedBy: User;

  @ManyToOne(() => User, (nameCard) => nameCard.nameCardMessages)
  @JoinColumn()
  nameCard: User;

  @Column({ default: false })
  isFriendRequest: boolean;
}

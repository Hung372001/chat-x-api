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
export class AllChatMessage extends BaseEntity {
  @Column({ nullable: true })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  imageUrls: string[];

  @Column({ type: 'jsonb', nullable: true })
  documentUrls: string[];

  @ManyToOne(() => User, (user) => user.allChatMessages)
  @JoinTable()
  sender: User;

  @ManyToOne(() => GroupChat, (group) => group.allChatMessages)
  @JoinTable()
  group: GroupChat;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => User, (deletedBy) => deletedBy.allDeletedMessages)
  @JoinTable()
  deletedBy: User;

  @Column({ default: false })
  unsent: boolean;

  @ManyToOne(() => User, (unsentBy) => unsentBy.allUnsentMessages)
  @JoinColumn()
  unsentBy: User;

  @Column({ default: false })
  pinned: boolean;

  @ManyToOne(() => User, (pinnedBy) => pinnedBy.allPinnedMessages)
  @JoinColumn()
  pinnedBy: User;

  @ManyToOne(() => User, (nameCard) => nameCard.allNameCardMessages)
  @JoinColumn()
  nameCard: User;

  @Column({ default: false })
  isFriendRequest: boolean;
}

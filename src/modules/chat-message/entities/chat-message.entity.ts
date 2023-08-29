import {
  Entity,
  Column,
  JoinTable,
  OneToMany,
  ManyToMany,
  ManyToOne,
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

  @Column({ nullable: true })
  documentUrl: string;

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
  readBy: User[];

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: false })
  unsend: boolean;
}

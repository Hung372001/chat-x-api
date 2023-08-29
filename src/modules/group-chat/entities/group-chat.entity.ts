import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { EGroupChatType } from '../dto/group-chat.enum';

@Entity()
export class GroupChat extends BaseEntity {
  @ManyToMany(() => User)
  @JoinTable()
  members: User[];

  @Column()
  name: string;

  @Column({ default: false })
  pinned: boolean;

  @Column({ default: 0 })
  unReads: number;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.group)
  @JoinTable()
  chatMessages: ChatMessage[];

  @Column({
    type: 'enum',
    enum: EGroupChatType,
  })
  type: EGroupChatType;
}

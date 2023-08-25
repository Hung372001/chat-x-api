import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { ChatMessage } from '@modules/chat-message/entities/chat-message.entity';
import { User } from '../../user/entities/user.entity';
import { BaseEntity } from '../../../common/entities/base.entity';

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

  @ManyToOne(() => ChatMessage, (chatMessage) => chatMessage.group)
  @JoinTable()
  chatMessages: ChatMessage[];
}

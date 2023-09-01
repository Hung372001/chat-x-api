import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { Profile } from '../../profile/entities/profile.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Exclude } from 'class-transformer';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';
import { UploadFile } from '../../upload/entities/upload.entity';
import { FCMToken } from '../../fcm-token/entities/fcm-token.entity';
import { Notification } from '../../notification/entities/notification.entity';

@Entity()
export class User extends BaseEntity {
  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phoneNumber: string;

  @Column()
  username: string;

  @Column()
  hashedPassword: string;

  @Column({ nullable: true })
  @Exclude()
  currentRefreshToken: string;

  @ManyToMany(() => Role)
  @JoinTable()
  roles: Role[];

  @OneToOne(() => Profile)
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => ChatMessage, (chatMessage) => chatMessage.sender)
  @JoinTable()
  chatMessages: ChatMessage[];

  @OneToMany(() => UploadFile, (uploadFiles) => uploadFiles.owner)
  uploadFiles: UploadFile[];

  @ManyToMany(() => User)
  @JoinTable()
  friends: User[];

  @OneToMany(() => FCMToken, () => (deviceTokens) => deviceTokens.user)
  deviceTokens: FCMToken[];

  @OneToMany(() => Notification, () => (deviceTokens) => deviceTokens.user)
  notifications: Notification[];
}

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
import { RollCall } from './roll-call.entity';
import { GroupChatSetting } from '../../group-chat/entities/group-chat-setting.entity';
import { GroupChat } from '../../group-chat/entities/group-chat.entity';
import { Friendship } from '../../friend/entities/friendship.entity';
import { FriendRequest } from '../../friend/entities/friend-request.entity';

@Entity()
export class User extends BaseEntity {
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column()
  username: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  hashedPassword: string;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  currentRefreshToken: string;

  @Column({ default: false })
  hiding: boolean;

  @Column({ default: true })
  soundNotification: boolean;

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

  @OneToMany(() => Friendship, (friends) => friends.toUser)
  @JoinTable()
  friends: Friendship[];

  @OneToMany(() => Friendship, (friends) => friends.fromUser)
  @JoinTable()
  beFriends: Friendship[];

  @OneToMany(() => FCMToken, () => (deviceTokens) => deviceTokens.user)
  deviceTokens: FCMToken[];

  @OneToMany(() => Notification, () => (deviceTokens) => deviceTokens.user)
  notifications: Notification[];

  @OneToMany(() => RollCall, () => (rollCalls) => rollCalls.user)
  rollCalls: RollCall[];

  @OneToMany(() => GroupChatSetting, (settings) => settings.user)
  groupChatSettings: GroupChatSetting[];

  @OneToMany(() => GroupChat, (ownGroup) => ownGroup.owner)
  ownGroups: GroupChat[];

  @OneToMany(() => ChatMessage, (deletedMessages) => deletedMessages.deletedBy)
  deletedMessages: ChatMessage[];

  @OneToMany(() => ChatMessage, (unsentMessages) => unsentMessages.unsentBy)
  unsentMessages: ChatMessage[];

  @OneToMany(() => ChatMessage, (pinnedMessages) => pinnedMessages.pinnedBy)
  pinnedMessages: ChatMessage[];

  @OneToMany(() => ChatMessage, (nameCardMessages) => nameCardMessages.nameCard)
  nameCardMessages: ChatMessage[];

  @OneToMany(
    () => FriendRequest,
    (requestFromUsers) => requestFromUsers.fromUser,
  )
  requestFromUsers: FriendRequest[];

  @OneToMany(() => FriendRequest, (requestToUsers) => requestToUsers.toUser)
  requestToUsers: FriendRequest[];
}

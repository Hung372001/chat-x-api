import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { WSAuthMiddleware } from './middlewares/auth.middleware';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { GroupChatGatewayService } from './services/group-chat.gateway.service';
import { GatewaySessionManager } from './sessions/gateway.session';
import { AuthSocket } from './interfaces/auth.interface';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { User } from '../user/entities/user.entity';
import { SendMessageDto } from '../chat-message/dto/send-message.dto';
import { ChatMessageGatewayService } from './services/chat-message.gateway.service';
import { SendConversationMessageDto } from '../chat-message/dto/send-conversation-message.dto';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { OnlinesSessionManager } from './sessions/onlines.session';
import { UserGatewayService } from './services/user.gateway.service';
import { NotificationService } from '../notification/notification.service';
import { ENotificationType } from '../notification/dto/enum-notification';
import { compact } from 'lodash';
import { CacheService } from '../cache/cache.service';

@WebSocketGateway({
  namespace: 'socket/chats',
  transports: ['websocket'],
  pingInterval: 10000,
  pingTimeout: 15000,
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:4000',
      'https://chat-x-black.vercel.app',
      'http://45.32.11.150:3002',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger(AppGateway.name);
  constructor(
    @Inject(GatewaySessionManager)
    private readonly socketSessions: GatewaySessionManager<AuthSocket>,
    @Inject(GatewaySessionManager)
    private readonly insideGroupSessions: GatewaySessionManager<string>,
    @Inject(OnlinesSessionManager)
    private readonly onlineSessions: OnlinesSessionManager,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(UserGatewayService) private userService: UserGatewayService,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
    @Inject(ChatMessageGatewayService)
    private chatMessageService: ChatMessageGatewayService,
    @Inject(NotificationService)
    private readonly notifyService: NotificationService,
    @Inject(CacheService) private cacheService: CacheService,
  ) {}

  afterInit(client: Socket) {
    if (this.logger) {
      this.logger.log('Gateway init!!!');
    }
    client.use(
      WSAuthMiddleware(
        this.jwtService,
        this.userService,
        this.cacheService,
      ) as any,
    );
  }

  // Connection and disconnect socket
  async handleConnection(client: AuthSocket) {
    this.logger.log(client.id, 'Connected..............................');
    this.socketSessions.setUserSession(client?.user?.id, client);
    this.onlineSessions.setUserSession(client?.user?.id, true);
    this.groupChatService.emitOnlineGroupMember(
      this.server,
      client,
      client?.user,
    );
  }

  async handleDisconnect(client: AuthSocket) {
    this.logger.log(client.id, 'Disconnected..............................');
    this.groupChatService.emitOfflineGroupMember(
      this.server,
      client,
      client?.user,
    );
    this.onlineSessions.removeUserSession(client?.user?.id);
    this.socketSessions.removeUserSession(client.user.id, client);
  }

  // Online and offile status of group member
  @SubscribeMessage('online')
  async handleMemberOnline(@ConnectedSocket() client: AuthSocket) {
    this.logger.log(`Online ${client?.user?.id}`);
    const isOnline = this.onlineSessions.getUserSession(client?.user?.id);
    if (!isOnline) {
      this.onlineSessions.setUserSession(client?.user?.id, true);
      this.groupChatService.emitOnlineGroupMember(
        this.server,
        client,
        client?.user,
        false,
      );
    }
  }

  @SubscribeMessage('offline')
  async handleMemberOffline(@ConnectedSocket() client: AuthSocket) {
    this.logger.log(`Offline ${client?.user?.id}`);
    const isOnline = this.onlineSessions.getUserSession(client?.user?.id);
    if (isOnline) {
      this.onlineSessions.setUserSession(client?.user?.id, false);
      this.groupChatService.emitOfflineGroupMember(
        this.server,
        client,
        client?.user,
        false,
      );
    }
  }

  async offline(user: User) {
    const clients = this.socketSessions.getUserSession(user?.id);
    if (clients?.length) {
      this.logger.log(`Offline ${user?.id}`);
      const isOnline = this.onlineSessions.getUserSession(user?.id);
      if (isOnline) {
        this.onlineSessions.setUserSession(user?.id, false);
        await Promise.all(
          clients.map(async (client) => {
            await this.groupChatService.emitOfflineGroupMember(
              this.server,
              client,
              user,
              false,
            );
          }),
        );
      }
    }
  }

  @SubscribeMessage('allConnection')
  async allConnection(
    @MessageBody() userId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.emit('allConnection', this.socketSessions.getSession().size);
  }

  @SubscribeMessage('isOnline')
  async checkOnlineStatus(
    @MessageBody() userId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.emit('isOnline', !!this.onlineSessions.getUserSession(userId));
  }

  @SubscribeMessage('enterGroupChat')
  async enterGroupChat(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.insideGroupSessions.setUserSession(groupId, client?.user?.id);
    client.emit('enterGroupChat', true);
  }

  @SubscribeMessage('outGroupChat')
  async outGroupChat(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.insideGroupSessions.removeUserSession(groupId, client?.user?.id);
    client.emit('outGroupChat', true);
  }

  @SubscribeMessage('getOnlineGroupMembers')
  async getOnlineGroupMembers(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOneWithMemberIds(groupId);
    if (groupChat) {
      const onlineMembers = groupChat.members.map((member) =>
        this.onlineSessions.getUserSession(member.id) ? member : null,
      );

      client.emit('onlineGroupMembersResponse', {
        onlineMembers: compact(onlineMembers),
      });
    }
  }

  @SubscribeMessage('onTypingStart')
  async onTypingStart(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.broadcast.to(groupId).emit('someoneIsTyping', {
      typingMember: client.user,
      groupChat: {
        id: groupId,
      },
    });
  }

  @SubscribeMessage('onTypingStop')
  async onTypingStop(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.broadcast.to(groupId).emit('someoneStopTyping', {
      typingMember: client.user,
      groupChat: {
        id: groupId,
      },
    });
  }

  joinGroup(groupChatId: string, groupMembers: User[]) {
    return Promise.all(
      groupMembers.map((member) => {
        const clients = this.socketSessions.getUserSession(member.id);
        if (clients?.length) {
          clients.forEach((client) => client.join(groupChatId));
        }
      }),
    );
  }

  leaveGroup(groupChatId: string, groupMembers: User[]) {
    return Promise.all(
      groupMembers.map((member) => {
        const clients = this.socketSessions.getUserSession(member.id);
        if (clients?.length) {
          clients.forEach((client) => client.leave(groupChatId));
        }
      }),
    );
  }

  // Call socket after group chat created successfully
  async createGroupChat(groupChat: GroupChat) {
    if (groupChat && groupChat.members?.length > 0) {
      await Promise.all(
        groupChat.members.map(async (x) => {
          const cacheKey = `GroupChatIds_${x.id}`;
          await this.cacheService.del(cacheKey);
        }),
      );

      await this.joinGroup(groupChat.id, groupChat.members);

      this.server.to(groupChat.id).emit('newGroupChatCreated', {
        groupChat,
      });
    }
  }

  // Call socket after group chat soft deleted successfully
  async removeGroupChat(groupChat: GroupChat) {
    if (groupChat && groupChat.members?.length > 0) {
      await this.cacheService.del(`GroupChat_${groupChat.id}`);
      await Promise.all(
        groupChat.members.map(async (x) => {
          const cacheKey = `GroupChatIds_${x.id}`;
          await this.cacheService.del(cacheKey);
        }),
      );

      this.server.to(groupChat.id).emit('groupChatRemoved', {
        groupChat,
      });

      await this.leaveGroup(groupChat.id, groupChat.members);
    }
  }

  async createNewFriendGroup(friend: User, currentUser: User) {
    const clients = this.socketSessions.getUserSession(currentUser.id);

    try {
      const groupChatDou = await this.groupChatService.getGroupChatDou(
        [friend.id, currentUser.id],
        this,
      );

      this.notifyService.send({
        title: currentUser.username,
        content: `${currentUser.username} đã gửi cho bạn lời mời kết bạn`,
        userId: friend.id,
        user: friend,
        imageUrl: currentUser.profile.avatar,
        notificationType: ENotificationType.NEW_FRIEND_REQUEST,
        data: { groupId: groupChatDou.id },
      });

      if (groupChatDou) {
        await this.joinGroup(groupChatDou.id, [friend, currentUser]);
        const newMessage = await this.chatMessageService.sendMessage(
          {
            message: `Bạn có lời mời kết bạn từ ${currentUser.username}`,
            imageUrls: null,
            documentUrls: null,
            groupId: groupChatDou.id,
            isFriendRequest: true,
          } as SendMessageDto,
          currentUser,
          groupChatDou,
        );
        if (newMessage) {
          this.server.to(groupChatDou.id).emit('newMessageReceived', {
            newMessage,
          });
        }
      }
    } catch (e: any) {
      if (clients?.length) {
        clients.forEach((client) =>
          client.emit('chatError', { errorMsg: e.message }),
        );
      }
    }
  }

  async acceptFriendRequest(friend: User, currentUser: User) {
    const clients = this.socketSessions.getUserSession(currentUser.id);

    try {
      const groupChatDou = await this.groupChatService.getGroupChatDou(
        [friend.id, currentUser.id],
        this,
      );

      // notify to friend for friend request is accepted
      this.notifyService.send({
        title: `${currentUser.username} đã chấp nhận lời mời kết bạn`,
        content: `Bạn và ${currentUser.username} đã trở thành bạn bè.`,
        userId: friend.id,
        user: friend,
        imageUrl: currentUser.profile?.avatar ?? null,
        notificationType: ENotificationType.ACCEPT_FRIEND_REQUEST,
        data: { groupId: groupChatDou?.id },
      });

      if (groupChatDou) {
        const newMessage = await this.chatMessageService.sendMessage(
          {
            message: `Bạn và ${friend.username} đã trở thành bạn bè, hãy gửi lời chào cho ${friend.username} nhé!`,
            imageUrls: null,
            documentUrls: null,
            groupId: groupChatDou.id,
            isFriendRequest: true,
          } as SendMessageDto,
          currentUser,
          groupChatDou,
        );
        if (newMessage) {
          this.server.to(groupChatDou.id).emit('newMessageReceived', {
            newMessage,
          });
        }

        this.server.to(groupChatDou.id).emit('acceptFriendRequest', {
          friend,
        });
      }
    } catch (e: any) {
      if (clients?.length) {
        clients.forEach((client) =>
          client.emit('chatError', { errorMsg: e.message }),
        );
      }
    }
  }

  // Call socket after add user into group chat successfully
  async addNewGroupMember(groupChat: GroupChat, newMembers: User[]) {
    if (groupChat && newMembers?.length > 0) {
      await this.cacheService.del(`GroupChat_${groupChat.id}`);
      await Promise.all(
        groupChat.members.map(async (x) => {
          const cacheKey = `GroupChatIds_${x.id}`;
          await this.cacheService.del(cacheKey);
        }),
      );

      await this.joinGroup(groupChat.id, newMembers);

      this.server.to(groupChat.id).emit('newMembersJoined', {
        groupChat,
        newMembers,
      });
    }
  }

  // Call socket after remove user from group chat successfully
  async removeGroupMember(groupChat: GroupChat, removeMembers: User[]) {
    if (groupChat && removeMembers?.length > 0) {
      await this.cacheService.del(`GroupChat_${groupChat.id}`);
      await Promise.all(
        groupChat.members.map(async (x) => {
          const cacheKey = `GroupChatIds_${x.id}`;
          await this.cacheService.del(cacheKey);
        }),
      );

      this.server.to(groupChat.id).emit('groupMembersRemoved', {
        groupChat,
        removeMembers,
      });

      await this.leaveGroup(groupChat.id, removeMembers);
    }
  }

  // Call socket after add new admin group chat successfully
  async modifyGroupAdmin(groupChat: GroupChat, admins: User[]) {
    if (groupChat) {
      const cacheKey = `GroupChatAdmins_${groupChat.id}`;
      await this.cacheService.del(cacheKey);

      this.server.to(groupChat.id).emit('adminGroupChatModified', {
        groupChat,
        admins,
      });
    }
  }

  // Call socket after rename group chat successfully
  async renameGroupChat(groupChat: GroupChat, newName: string) {
    if (groupChat) {
      this.server.to(groupChat.id).emit('groupChatRenamed', {
        groupChat,
        newName,
      });
    }
  }

  // Call socket after rename group chat successfully
  async pinChatMessage(groupChat: GroupChat, pinnedMessage: ChatMessage) {
    if (groupChat) {
      this.server.to(groupChat.id).emit('messagePinned', {
        groupChat,
        pinnedMessage,
      });
    }
  }

  // Call socket after rename group chat successfully
  async unpinChatMessage(groupChat: GroupChat, unpinnedMessage: ChatMessage) {
    if (groupChat) {
      this.server.to(groupChat.id).emit('messageUnpinned', {
        groupChat,
        unpinnedMessage,
      });
    }
  }

  // Chat message
  @SubscribeMessage('onSendMessage')
  async onSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const { tmpId } = data;
    try {
      const newMessage = await this.chatMessageService.sendMessage(
        data,
        client.user,
      );

      if (newMessage) {
        if (newMessage.isNewMember) {
          await this.addNewGroupMember(newMessage.group, [client.user]);
        }

        this.server.to(newMessage.group.id).emit('newMessageReceived', {
          newMessage,
          tmpId,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message, tmpId });
    }
  }

  @SubscribeMessage('onSendConversationMessage')
  async onSendConversationMessage(
    @MessageBody() data: SendConversationMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const { tmpId } = data;
    try {
      const groupChatDou = await this.groupChatService.getGroupChatDou(
        [data.receiverId, client.user.id],
        this,
      );

      if (groupChatDou) {
        const newMessage = await this.chatMessageService.sendMessage(
          { ...data, groupId: groupChatDou.id },
          client.user,
          groupChatDou,
        );
        if (newMessage) {
          if (newMessage.isNewMember) {
            await this.joinGroup(newMessage.group.id, [client.user]);
          }

          this.server.to(newMessage.group.id).emit('newMessageReceived', {
            newMessage,
            tmpId,
          });
        }
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message, tmpId });
    }
  }

  @SubscribeMessage('onReadMessages')
  async onReadMessages(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const { groupChat, unReadMessages } =
        await this.groupChatService.readMessages(groupId, client.user);

      if (groupChat && unReadMessages) {
        client.emit('messagesRead', {
          groupChat,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onTestListener')
  async onTestListener(
    @MessageBody() message: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    client.emit('onTestListener', message);
    client.emit('testListenerReceived', message);
  }

  @SubscribeMessage('onReadConversationMessages')
  async onReadConversationMessages(
    @MessageBody() receiverId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const groupChatDou = await this.groupChatService.getGroupChatDou(
        [receiverId, client.user.id],
        this,
      );

      if (groupChatDou) {
        const { groupChat, unReadMessages } =
          await this.groupChatService.readMessages(
            groupChatDou.id,
            client.user,
          );

        if (groupChat && unReadMessages) {
          client.emit('messagesRead', {
            groupChat,
          });
        }
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onPinMessage')
  async onPinMessage(
    @MessageBody() chatMessageId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const pinnedMessage = await this.chatMessageService.togglePinMessage(
        chatMessageId,
        client.user,
        true,
      );

      if (pinnedMessage) {
        this.server.to(pinnedMessage.group.id).emit('messagePinned', {
          pinnedMessage,
          pinnedUser: client.user,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onUnpinMessage')
  async onUnpinMessage(
    @MessageBody() chatMessageId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const unPinnedMessage = await this.chatMessageService.togglePinMessage(
        chatMessageId,
        client.user,
        false,
      );

      if (unPinnedMessage) {
        this.server.to(unPinnedMessage.group.id).emit('messageUnpinned', {
          unPinnedMessage,
          unpinnedUser: client.user,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onUnsendMessage')
  async onUnsendMessage(
    @MessageBody() chatMessageId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const unsendMessage = await this.chatMessageService.unsendMessage(
        chatMessageId,
        client.user,
      );

      if (unsendMessage) {
        this.server.to(unsendMessage.group.id).emit('messageUnsent', {
          unsendMessage,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onDeleteMessage')
  async onDeleteMessage(
    @MessageBody() chatMessageId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const deletedMessage = await this.chatMessageService.remove(
        chatMessageId,
        client.user,
      );

      if (deletedMessage) {
        this.server.to(deletedMessage.group.id).emit('messageDeleted', {
          deletedMessage,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }
}

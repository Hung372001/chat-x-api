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
import { UserService } from '../user/user.service';
import { GroupChatGatewayService } from './services/group-chat.gateway.service';
import { GatewaySessionManager } from './sessions/gateway.session';
import { AuthSocket } from './interfaces/auth.interface';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { User } from '../user/entities/user.entity';
import { SendMessageDto } from '../chat-message/dto/send-message.dto';
import { ChatMessageGatewayService } from './services/chat-message.gateway.service';
import { SendConversationMessageDto } from '../chat-message/dto/send-conversation-message.dto';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';
import { ReadMessageDto } from '../chat-message/dto/read-message.dto';
import { OnlinesSessionManager } from './sessions/onlines.session';
import { UserGatewayService } from './services/user.gateway.service';
import { NotificationService } from '../notification/notification.service';
import { ENotificationType } from '../notification/dto/enum-notification';

@WebSocketGateway({
  namespace: 'socket/chats',
  transports: ['websocket'],
  pingInterval: 10000,
  pingTimeout: 15000,
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:4000'],
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
  ) {}

  afterInit(client: Socket) {
    if (this.logger) {
      this.logger.log('Gateway init!!!');
    }
    client.use(WSAuthMiddleware(this.jwtService, this.userService) as any);
  }

  // Connection and disconnect socket
  async handleConnection(client: AuthSocket) {
    this.logger.log(client.id, 'Connected..............................');
    this.socketSessions.setUserSession(client?.user?.id, client);
    this.onlineSessions.setUserSession(client?.user?.id, true);
    this.groupChatService.emitOnlineGroupMember(client, client?.user);
  }

  async handleDisconnect(client: AuthSocket) {
    this.logger.log(client.id, 'Disconnected..............................');
    this.groupChatService.emitOnlineGroupMember(client, client?.user);
    this.onlineSessions.removeUserSession(client?.user?.id);
    this.socketSessions.removeUserSession(client.user.id, client);
  }

  // Online and offile status of group member
  @SubscribeMessage('online')
  async handleMemberOnline(@ConnectedSocket() client: AuthSocket) {
    this.onlineSessions.setUserSession(client?.user?.id, true);
    this.groupChatService.emitOnlineGroupMember(client, client?.user, false);
  }

  @SubscribeMessage('offline')
  async handleMemberOffline(@ConnectedSocket() client: AuthSocket) {
    this.onlineSessions.setUserSession(client?.user?.id, false);
    this.groupChatService.emitOfflineGroupMember(client, client?.user, false);
  }

  @SubscribeMessage('enterGroupChat')
  async enterGroupChat(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.insideGroupSessions.setUserSession(groupId, client?.user?.id);
  }

  @SubscribeMessage('outGroupChat')
  async outGroupChat(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    this.insideGroupSessions.removeUserSession(groupId, client?.user?.id);
  }

  @SubscribeMessage('getOnlineGroupMembers')
  async getOnlineGroupMembers(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOne({ id: groupId });
    if (groupChat) {
      const onlineMembers = groupChat.members.map((member) =>
        this.onlineSessions.getUserSession(member.id) ? member : null,
      );

      client.emit('onlineGroupMembersResponse', {
        onlineMembers,
        allMembers: groupChat.members,
      });
    }
  }

  @SubscribeMessage('onTypingStart')
  async onTypingStart(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOne({ id: groupId });
    if (groupChat && groupChat.members.some((x) => x.id === client.user.id)) {
      client.broadcast.to(groupId).emit('someoneIsTyping', {
        typingMember: client.user,
        groupChat: groupChat,
      });
    }
  }

  @SubscribeMessage('onTypingStop')
  async onTypingStop(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOne({ id: groupId });
    if (groupChat && groupChat.members.some((x) => x.id === client.user.id)) {
      client.broadcast.to(groupId).emit('someoneStopTyping', {
        typingMember: client.user,
        groupChat: groupChat,
      });
    }
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
      await this.joinGroup(groupChat.id, groupChat.members);

      this.server.to(groupChat.id).emit('newGroupChatCreated', {
        groupChat,
      });
    }
  }

  // Call socket after group chat soft deleted successfully
  async removeGroupChat(groupChat: GroupChat) {
    if (groupChat && groupChat.members?.length > 0) {
      this.server.to(groupChat.id).emit('groupChatRemoved', {
        groupChat,
      });

      await this.leaveGroup(groupChat.id, groupChat.members);
    }
  }

  async createNewFriendGroup(friend: User, currentUser: User) {
    const clients = this.socketSessions.getUserSession(currentUser.id);

    try {
      this.notifyService.send({
        title: currentUser.username,
        content: `${currentUser.username} đã gửi cho bạn lời mời kết bạn`,
        userId: friend.id,
        imageUrl: currentUser.profile.avatar,
        notificationType: ENotificationType.NEW_FRIEND_REQUEST,
      });

      const groupChatDou = await this.groupChatService.getGroupChatDou(
        [friend.id, currentUser.id],
        this,
      );

      if (groupChatDou) {
        await this.joinGroup(groupChatDou.id, [friend, currentUser]);
        const newMessage = await this.chatMessageService.sendMessage(
          {
            message: `Bạn có lời mời kết bạn từ ${currentUser.username}`,
            imageUrls: null,
            documentUrls: null,
            groupId: groupChatDou.id,
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

  // Call socket after add user into group chat successfully
  async addNewGroupMember(groupChat: GroupChat, newMembers: User[]) {
    if (groupChat && newMembers?.length > 0) {
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
      await this.leaveGroup(groupChat.id, removeMembers);

      this.server.to(groupChat.id).emit('groupMembersRemoved', {
        groupChat,
        removeMembers,
      });
    }
  }

  // Call socket after add new admin group chat successfully
  async addNewGroupAdmin(groupChat: GroupChat, newAdmin: User) {
    if (groupChat) {
      this.server.to(groupChat.id).emit('newAdminGroupChatAdded', {
        groupChat,
        newAdmin,
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
    try {
      const newMessage = await this.chatMessageService.sendMessage(
        data,
        client.user,
      );
      if (newMessage) {
        client.broadcast.to(newMessage.group.id).emit('newMessageReceived', {
          newMessage,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onSendConversationMessage')
  async onSendConversationMessage(
    @MessageBody() data: SendConversationMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
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
          client.broadcast.to(newMessage.group.id).emit('newMessageReceived', {
            newMessage,
          });
        }
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }

  @SubscribeMessage('onReadMessages')
  async onReadMessages(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const groupChat = await this.groupChatService.readMessages(
        groupId,
        client.user,
      );

      if (groupChat) {
        client.broadcast.to(groupChat.id).emit('messagesRead', {
          groupChat,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
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
        const groupChat = await this.groupChatService.readMessages(
          groupChatDou.id,
          client.user,
        );

        if (groupChat) {
          client.broadcast.to(groupChat.id).emit('messagesRead', {
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
        client.broadcast.to(pinnedMessage.group.id).emit('messagePinned', {
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
        client.broadcast.to(unPinnedMessage.group.id).emit('messageUnpinned', {
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
        client.broadcast.to(unsendMessage.group.id).emit('messageUnsent', {
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
        client.broadcast.to(deletedMessage.group.id).emit('messageDeleted', {
          deletedMessage,
        });
      }
    } catch (e: any) {
      client.emit('chatError', { errorMsg: e.message });
    }
  }
}

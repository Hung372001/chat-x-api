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
import { GatewaySessionManager } from './gateway.session';
import { AuthSocket } from './interfaces/auth.interface';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { User } from '../user/entities/user.entity';
import { SendMessageDto } from '../chat-message/dto/send-message.dto';
import { ChatMessageGatewayService } from './services/chat-message.request.service';
import { SendConversationMessageDto } from '../chat-message/dto/send-conversation-message.dto';
import { ChatMessage } from '../chat-message/entities/chat-message.entity';

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
    private readonly sessions: GatewaySessionManager,
    @Inject(JwtService) private jwtService: JwtService,
    @Inject(UserService) private userService: UserService,
    @Inject(GroupChatGatewayService)
    private groupChatService: GroupChatGatewayService,
    @Inject(ChatMessageGatewayService)
    private chatMessageService: ChatMessageGatewayService,
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
    this.sessions.setUserSocket(client?.user?.id, client);
    this.groupChatService.emitOnlineGroupMember(client, client?.user);
  }

  async handleDisconnect(client: AuthSocket) {
    this.logger.log(client.id, 'Disconnected..............................');
    this.groupChatService.emitOnlineGroupMember(client, client?.user);
    this.sessions.removeUserSocket(client.user.id);
  }

  // Online and offile status of group member
  @SubscribeMessage('online')
  async handleMemberOnline(@ConnectedSocket() client: AuthSocket) {
    this.groupChatService.emitOnlineGroupMember(client, client?.user, false);
  }

  @SubscribeMessage('offline')
  async handleMemberOffline(@ConnectedSocket() client: AuthSocket) {
    this.groupChatService.emitOnlineGroupMember(client, client?.user, false);
  }

  @SubscribeMessage('getOnlineGroupMembers')
  async getOnlineGroupMembers(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOne({ id: groupId });
    if (groupChat) {
      const onlineMembers = groupChat.members.map((member) =>
        this.sessions.getUserSocket(member.id) ? member : null,
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
        const client = this.sessions.getUserSocket(member.id);
        if (client) {
          client.join(groupChatId);
        }
      }),
    );
  }

  leaveGroup(groupChatId: string, groupMembers: User[]) {
    return Promise.all(
      groupMembers.map((member) => {
        const client = this.sessions.getUserSocket(member.id);
        if (client) {
          client.leave(groupChatId);
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
    const newMessage = await this.chatMessageService.sendMessage(
      data,
      client.user,
    );
    if (newMessage) {
      client.broadcast.to(newMessage.group.id).emit('newMessageReceived', {
        newMessage,
      });
    }
  }

  @SubscribeMessage('onSendConversationMessage')
  async onSendConversationMessage(
    @MessageBody() data: SendConversationMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
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

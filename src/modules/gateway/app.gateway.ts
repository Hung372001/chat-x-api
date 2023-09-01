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
import { GroupChatGatewayService } from './group-chat.gateway.service';
import { GatewaySessionManager } from './gateway.session';
import { AuthSocket } from './interfaces/auth.interface';
import { GroupChat } from '../group-chat/entities/group-chat.entity';
import { User } from '../user/entities/user.entity';
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

  // Chat message
  async createNewMessage(newMessage: ChatMessage) {
    if (newMessage) {
      const client = this.sessions.getUserSocket(newMessage.sender.id);

      if (client) {
        client.broadcast.to(newMessage.group.id).emit('newMessageReceived', {
          newMessage,
        });
      }
    }
  }

  async unsendMessage(unsendMessage: ChatMessage) {
    if (unsendMessage) {
      const client = this.sessions.getUserSocket(unsendMessage.sender.id);

      if (client) {
        client.broadcast
          .to(unsendMessage.group.id)
          .emit('unsendMessageReceived', {
            unsendMessage,
          });
      }
    }
  }
}

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
import { CacheService } from '../cache/cache.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { GroupChatService } from '../group-chat/group-chat.service';
import { ChatMessageService } from '../chat-message/chat-message.service';
import { NewMessageDto } from '../chat-message/dto/new-message.dto';
import { GatewaySessionManager } from './gateway.session';
import { AuthSocket } from './interfaces/auth.interface';

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
    @Inject(GroupChatService) private groupChatService: GroupChatService,
    @Inject(ChatMessageService) private chatMessageService: ChatMessageService,
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
    this.sessions.setUserSocket(client?.data?.user.id, client);
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
  }

  // Group chat
  @SubscribeMessage('onJoinGroup')
  async handleJoinGroup(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOneBy({ id: groupId });
    if (!groupChat) {
      client.emit('onSockerError', 'Group chat is not found.');
    }

    this.logger.log(`${client?.user?.username} joined`);

    client.broadcast.to(groupChat.id).emit('newMemberJoined', {
      groupChat,
      member: client?.user,
    });
  }

  // Chat message
  @SubscribeMessage('onSendMessage')
  async newMessage(
    @MessageBody() data: NewMessageDto,
    @ConnectedSocket() client: AuthSocket,
  ) {
    const groupChat = await this.groupChatService.findOneBy({
      id: data.groupId,
    });

    if (!groupChat) {
      return client.emit('onSockerError', 'Group chat is not found.');
    }

    const newMessage = await this.chatMessageService.createWithSender(
      data,
      client?.data?.user,
      groupChat,
    );

    client.broadcast.to(data.groupId).emit('newMessageReceived', {
      newMessage,
    });
  }

  @SubscribeMessage('onUnsendMessage')
  async unsendMessage(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: AuthSocket,
  ) {
    try {
      const chatMessage = await this.chatMessageService.updateWithSender(
        messageId,
        {
          unsend: true,
        },
        client?.data?.user,
      );

      client.broadcast
        .to(chatMessage.group.name)
        .emit('unsendMessageReceived', {
          chatMessage,
        });
    } catch (e: any) {
      return client.emit('onSockerError', e.message);
    }
    const message = await this.chatMessageService.findOneBy({
      id: messageId,
    });

    if (!message) {
      return client.emit('onSockerError', 'Chat message is not found.');
    }
  }
}

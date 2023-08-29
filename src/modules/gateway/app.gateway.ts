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

@WebSocketGateway({
  namespace: 'socket/chats',
  transports: ['websocket'],
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

  async handleConnection(client: Socket) {
    this.logger.log(client.id, 'Connected..............................');
    this.groupChatService.emitOnlineGroupMember(client, client.data?.user);
  }

  @SubscribeMessage('online')
  async online(@ConnectedSocket() client: Socket) {
    this.groupChatService.emitOnlineGroupMember(
      client,
      client.data?.user,
      false,
    );
  }

  @SubscribeMessage('join_group-chat')
  async joinGroup(
    @MessageBody() groupId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const groupChat = await this.groupChatService.findOneBy({ id: groupId });
    if (!groupChat) {
      client.emit('socker-error', 'Group chat is not found.');
    }

    this.logger.log(`${client.data?.user?.username} joined`);

    client.broadcast.to(groupChat.name).emit('new-member_joined', {
      groupChat,
      member: client.data?.user,
    });
  }

  @SubscribeMessage('send_new-message')
  async newMessage(
    @MessageBody() data: NewMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const groupChat = await this.groupChatService.findOneBy({
      name: data.groupName,
    });

    if (!groupChat) {
      return client.emit('socker-error', 'Group chat is not found.');
    }

    const newMessage = await this.chatMessageService.createWithSender(
      data,
      client?.data?.user,
      groupChat,
    );

    client.broadcast.to(data.groupName).emit('receive_new-message', {
      newMessage,
    });
  }

  @SubscribeMessage('unsend_message')
  async unsendMessage(
    @MessageBody() messageId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const chatMessage = await this.chatMessageService.updateWithSender(
        messageId,
        {
          unsend: true,
        },
        client?.data?.user,
      );

      client.broadcast.to(chatMessage.group.name).emit('receive_new-message', {
        chatMessage,
      });
    } catch (e: any) {
      return client.emit('socker-error', e.message);
    }
    const message = await this.chatMessageService.findOneBy({
      id: messageId,
    });

    if (!message) {
      return client.emit('socker-error', 'Chat message is not found.');
    }
  }

  @SubscribeMessage('offline')
  async offline(@ConnectedSocket() client: Socket) {
    this.groupChatService.emitOnlineGroupMember(
      client,
      client.data?.user,
      false,
    );
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(client.id, 'Disconnected..............................');
    this.groupChatService.emitOnlineGroupMember(client, client.data?.user);
  }
}

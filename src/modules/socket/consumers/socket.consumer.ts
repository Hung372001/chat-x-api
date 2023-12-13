import { Controller, Inject, Logger } from '@nestjs/common';
import { AppGateway } from '../../gateway/app.gateway';
import { RmqService } from '../../rmq/rmq.service';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class SocketConsumer {
  private readonly logger = new Logger(SocketConsumer.name);

  constructor(
    @Inject(AppGateway) private readonly gateway: AppGateway,
    @Inject(RmqService)
    private rmqService: RmqService,
  ) {}

  @EventPattern('createGroupChat')
  createGroupChat(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      return this.gateway.createGroupChat(data.newGroupChat);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('renameGroup')
  renameGroupChat(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { foundGroupChat, newName } = data;
      return this.gateway.renameGroupChat(foundGroupChat, newName);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('addNewMember')
  addNewGroupMember(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { foundGroupChat, members } = data;
      return this.gateway.addNewGroupMember(foundGroupChat, members);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('modifyAdmin')
  modifyGroupAdmin(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { foundGroupChat, admins } = data;
      return this.gateway.modifyGroupAdmin(foundGroupChat, admins);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('removeMember')
  removeGroupMember(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { foundGroupChat, members } = data;
      return this.gateway.removeGroupMember(foundGroupChat, members);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('removeGroupChat')
  removeGroupChat(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { foundGroupChat } = data;
      return this.gateway.removeGroupChat(foundGroupChat);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('offline')
  offline(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { currentUser } = data;
      return this.gateway.offline(currentUser);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('createFriendGroup')
  createNewFriendGroup(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { friend, currentUser } = data;
      return this.gateway.createNewFriendGroup(friend, currentUser);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }

  @EventPattern('acceptFriendRequest')
  acceptFriendRequest(@Payload() data: any, @Ctx() context: RmqContext) {
    try {
      const { friend, currentUser } = data;
      return this.gateway.acceptFriendRequest(friend, currentUser);
    } catch (e: any) {
      this.logger.error(e);
    } finally {
      this.rmqService.ack(context);
    }
  }
}

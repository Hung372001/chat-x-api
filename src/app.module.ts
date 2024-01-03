/* eslint-disable @typescript-eslint/no-var-requires */
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { configsValidator } from './configs/configs.validate';
import { DatabaseModule } from './database/database.module';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  RouterModule,
} from '@nestjs/core';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { CustomeCacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatMessageModule } from './modules/chat-message/chat-message.module';
import { GroupChatModule } from './modules/group-chat/group-chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { RmqModule } from './modules/rmq/rmq.module';
import { FCMTokenModule } from './modules/fcm-token/fcm-token.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ProfileModule } from './modules/profile/profile.module';
import { FriendModule } from './modules/friend/friend.module';
import { SearchModule } from './modules/search/search.module';
import { LoggerModule } from './modules/logger/logger.module';
import { SocketModule } from './modules/socket/socket.module';
import { AllExceptionsFilter } from './interceptors/all-exception.filter';
import { EServiceType } from './common/enums/service-type.enum';
import { compact } from 'lodash';

const apiV1Modules = [
  UserModule,
  RoleModule,
  ProfileModule,
  ChatMessageModule,
  GroupChatModule,
  UploadModule,
  FCMTokenModule,
  NotificationModule,
  FriendModule,
  SearchModule,
];

@Module({
  imports: compact([
    RouterModule.register([
      {
        path: 'api/v1',
        children: apiV1Modules,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configsValidator,
      envFilePath: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env',
    }),
    CacheModule.register<RedisClientOptions>({
      isGlobal: true,
      store: redisStore,
      url: `${process.env.REDIS_URI}`,
      ttl: 0,
      pingInterval: 1000,
    }),
    LoggerModule.forRoot(),
    process.env.SERVICE_TYPE === EServiceType.BACKGROUND_SERVICE
      ? ScheduleModule.forRoot()
      : null,
    SchedulerModule,
    DatabaseModule,
    AuthModule,
    CustomeCacheModule,
    GatewayModule,
    RmqModule,
    SocketModule,
    ...apiV1Modules,
  ]),
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}

import { CacheModule, CacheInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { configsValidator } from './configs/configs.validate';
import { DatabaseModule } from './database/database.module';
import { APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { CustomeCacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatMessageModule } from './modules/chat-message/chat-message.module';
import { GroupChatModule } from './modules/group-chat/group-chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { GatewayModule } from './modules/gateway/gateway.module';

const apiV1Modules = [
  UserModule,
  RoleModule,
  ChatMessageModule,
  GroupChatModule,
  UploadModule,
];

@Module({
  imports: [
    RouterModule.register([
      {
        path: 'api/v1',
        children: apiV1Modules,
      },
    ]),
    ConfigModule.forRoot({
      validationSchema: configsValidator,
      envFilePath: process.env.NODE_ENV === 'development' ? '.env.dev' : '.env',
    }),
    CacheModule.register<RedisClientOptions>({
      isGlobal: true,
      store: redisStore,
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      ttl: 0,
    }),
    DatabaseModule,
    AuthModule,
    CustomeCacheModule,
    GatewayModule,
    ...apiV1Modules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}

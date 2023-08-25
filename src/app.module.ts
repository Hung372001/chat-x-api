import { CacheModule, CacheInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import type { RedisClientOptions } from 'redis';
import * as redisStore from 'cache-manager-redis-store';
import { configsValidator } from './configs/configs.validate';
import { DatabaseModule } from './database/database.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './modules/auth/jwt.strategy';
import { CustomeCacheModule } from './modules/cache/cache.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatMessageModule } from './modules/chat-message/chat-message.module';
import { GroupChatModule } from './modules/group-chat/group-chat.module';
import { UploadModule } from './modules/upload/upload.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
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
    AuthModule,
    DatabaseModule,
    UserModule,
    RoleModule,
    CustomeCacheModule,
    ChatMessageModule,
    GroupChatModule,
    UploadModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtModule,
    JwtStrategy,
    JwtService,
    UserModule,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}

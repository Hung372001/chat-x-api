import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DBLogger } from '../modules/logger/db-logger';
import { LoggerModule } from '../modules/logger/logger.module';
import { TelegramLoggerService } from '../modules/logger/telegram.logger-service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule, LoggerModule],
      inject: [ConfigService, TelegramLoggerService],
      useFactory: (
        configService: ConfigService,
        telegramLogger: TelegramLoggerService,
      ) => ({
        type: 'postgres',
        replication: {
          master: {
            host: configService.get('DB_HOST'),
            port: +configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
            entities: [__dirname + '/../**/*.entity.js'],
            synchronize: true,
          },
          slaves: [
            {
              host: configService.get('DB_REPL_HOST'),
              port: +configService.get('DB_REPL_PORT'),
              username: configService.get('DB_REPL_USERNAME'),
              password: configService.get('DB_PASSWORD'),
              database: configService.get('DB_DATABASE'),
            },
            {
              host: configService.get('DB_REPL_HOST_2'),
              port: +configService.get('DB_REPL_PORT_2'),
              username: configService.get('DB_REPL_USERNAME'),
              password: configService.get('DB_PASSWORD'),
              database: configService.get('DB_DATABASE'),
            },
            {
              host: configService.get('DB_REPL_HOST_3'),
              port: +configService.get('DB_REPL_PORT_3'),
              username: configService.get('DB_REPL_USERNAME'),
              password: configService.get('DB_PASSWORD'),
              database: configService.get('DB_DATABASE'),
            },
          ],
        },
        logging: true,
        logger: new DBLogger(telegramLogger),
        maxQueryExecutionTime: 2000,
        keepConnectionAlive: true,
        autoLoadEntities: true,
        extra: {
          idleTimeoutMillis: 2000,
          poolSize: 100,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}

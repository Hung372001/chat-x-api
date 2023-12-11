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
          ],
        },
        logging: true,
        logger: new DBLogger(telegramLogger),
        maxQueryExecutionTime: 2000,
        keepConnectionAlive: true,
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}

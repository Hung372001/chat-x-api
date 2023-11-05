import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        keepConnectionAlive: true,
        type: 'postgres',
        autoLoadEntities: true,
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
      }),
    }),
  ],
})
export class DatabaseModule {}

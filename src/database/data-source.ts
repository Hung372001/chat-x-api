import { DataSource, DataSourceOptions } from 'typeorm';
import { DBLogger } from '../modules/logger/db-logger';

const dataSource = new DataSource({
  keepConnectionAlive: true,
  type: 'postgres',
  autoLoadEntities: true,
  replication: {
    master: {
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [__dirname + '/../**/*.entity.js'],
      synchronize: true,
    },
    slaves: [
      {
        host: process.env.DB_REPL_HOST,
        port: +process.env.DB_REPL_PORT,
        username: process.env.DB_REPL_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
    ],
  },
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  extra: {
    idleTimeoutMillis: 2000,
    poolSize: 20,
  },
  cli: {
    migrationsDir: 'src/database/migrations',
  },
} as DataSourceOptions);

export default dataSource;

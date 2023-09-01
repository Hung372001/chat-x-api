import path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  username: process.env.DB_USERNAME,
  port: Number(process.env.DB_PORT),
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/database/migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  migrationsRun: false,
  cli: {
    migrationsDir: 'src/database/migrations',
  },
} as DataSourceOptions);

export default dataSource;

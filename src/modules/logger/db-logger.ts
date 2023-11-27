/* eslint-disable @typescript-eslint/no-empty-function */
import { Logger, QueryRunner } from 'typeorm';
import { TelegramLoggerService } from './telegram.logger-service';

export class DBLogger implements Logger {
  private _telegramLogger: TelegramLoggerService;

  constructor(telegramLogger: TelegramLoggerService) {
    this._telegramLogger = telegramLogger;
  }

  logQueryError(
    error: string,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this._telegramLogger.error({
      message: `${query} - ${JSON.stringify(parameters)}`,
      error: JSON.stringify(error),
    });
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this._telegramLogger.error({
      time,
      message: `${query} - ${JSON.stringify(parameters)}`,
    });
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {}

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {}

  logMigration(message: string, queryRunner?: QueryRunner) {}

  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ) {}
}

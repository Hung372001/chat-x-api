import { DynamicModule, Global, Module } from '@nestjs/common';
import { TelegramLoggerService } from './telegram.logger-service';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      providers: [TelegramLoggerService],
      exports: [TelegramLoggerService],
    };
  }
}

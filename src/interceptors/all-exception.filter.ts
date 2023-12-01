import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { pick } from 'lodash';
import { TelegramLoggerService } from '../modules/logger/telegram.logger-service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(TelegramLoggerService) private telegramLog: TelegramLoggerService,
  ) {}

  catch(exception: Error, host: ArgumentsHost): void {
    const requestFromHost = host.getArgs()[0];
    if (requestFromHost) {
      this.telegramLog.error(
        `
            Error: ${JSON.stringify(exception.message, null, '\t')}
            
            Request:
            ${JSON.stringify(
              pick(requestFromHost, [
                'sessionID',
                'route',
                'user',
                'rawHeader',
                'query',
                'params',
                'body',
                'method',
                'hostname',
              ]),
              null,
              '\t',
            )}
          `,
      );
    }

    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.BAD_REQUEST;

    const message =
      exception instanceof HttpException
        ? exception.getResponse() || exception.message
        : exception.message || 'Internal server error';

    const errorResponse = {
      ...(typeof message === 'string' ? { message } : message),
      statusCode,
      timestamp: new Date().toISOString(),
      success: false,
      path: request.url,
      method: request.method,
      errorName: exception?.name,
    };

    res.status(statusCode).json(errorResponse);
  }
}

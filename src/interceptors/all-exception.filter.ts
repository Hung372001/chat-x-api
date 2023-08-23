import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
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

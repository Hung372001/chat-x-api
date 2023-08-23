import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * It takes the exception and host as arguments, then it gets the response and request from the host,
   * gets the status from the exception, gets the response from the exception, sets the status of the
   * response to the status of the exception, and then returns a JSON object with the timestamp,
   * success, path, and message
   * @param {HttpException} exception - The exception that was thrown.
   * @param {ArgumentsHost} host - ArgumentsHost
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const response = exception.getResponse();

    res.status(status).json({
      timestamp: new Date().toISOString(),
      success: false,
      path: request.url,
      ...(typeof response === 'string'
        ? { message: response, statusCode: status }
        : response),
    });
  }
}

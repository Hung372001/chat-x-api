import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface Response<T> {
  data: T;
}

@Injectable()
/* It's an interceptor that takes the data from the response and wraps it in an object with a success
  property */
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const requestId = uuidv4();
    return next
      .handle()
      .pipe(map((data) => ({ data, success: true, requestId })));
  }
}

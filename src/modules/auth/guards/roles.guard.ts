import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ROLES } from 'src/decorators/roles.decorator';
import { RequestWithUser } from 'src/types/requests.type';
import { intersection } from 'lodash';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly refector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles: string[] = this.refector.getAllAndOverride(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request: RequestWithUser = context.switchToHttp().getRequest();
    const containRoles = intersection(
      roles,
      request.user.roles.map((x) => x.type),
    );
    return containRoles.length > 0;
  }
}

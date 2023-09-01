import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from './permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndMerge<string[]>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    const result = requiredPermissions.some((permission) =>
      user?.permissions?.includes(permission),
    );
    return result;
  }
}

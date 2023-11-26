import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req) {
      const key = req.headers['x-api-key'] ?? null;
      return !!key && process.env.X_API_KEY === key.trim();
    }
    return false;
  }
}

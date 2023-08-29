import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CacheService } from './cache.service';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';

@ApiTags('cache')
@Controller('cache')
@ApiBearerAuth()
@UseGuards(JwtAccessTokenGuard)
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Delete(':controller')
  remove(@Param('controller') controller: string) {
    return this.cacheService.delController(controller);
  }
}

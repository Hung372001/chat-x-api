import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CacheService } from './cache.service';

@ApiTags('cache')
@Controller('cache')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}

  @Delete(':controller')
  remove(@Param('controller') controller: string) {
    return this.cacheService.delController(controller);
  }
}

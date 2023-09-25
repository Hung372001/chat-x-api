import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FilterDto } from '../../common/dto/filter.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessTokenGuard } from '../auth/guards/jwt-access-token.guard';
import { PermissionGuard } from '../permission/permissison.guard';
import { SearchService } from './services/search.request.service';
import { SearchDto } from './dto/search.dto';

@Controller('search')
@ApiTags('search')
@ApiBearerAuth()
@UseGuards(PermissionGuard)
@UseGuards(JwtAccessTokenGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  findAll(@Query() query: SearchDto) {
    return this.searchService.findAll(query);
  }
}

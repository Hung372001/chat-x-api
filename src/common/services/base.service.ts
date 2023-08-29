import {
  Brackets,
  DeleteResult,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository,
  UpdateResult,
} from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FilterDto } from '../dto/filter.dto';
import { FindAllResponse } from '../responses/find-all.response';
import { BaseServiceInterface } from './base.service.interface';
import { BaseEntity } from '../entities/base.entity';

export abstract class BaseService<T extends BaseEntity>
  implements BaseServiceInterface<T>
{
  constructor(private readonly repository: Repository<T>) {}

  name<T extends new (...args: any[]) => any>(clazz: T): string {
    return clazz.name;
  }

  async findAll(query: FilterDto): Promise<FindAllResponse<T>> {
    const {
      orKeyword = '',
      andKeyword = '',
      searchAndBy = '',
      searchOrBy = !query.searchOrBy && !query.searchAndBy
        ? ['name']
        : query.searchOrBy,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 10,
      page = 1,
      isGetAll = false,
    } = query;

    const queryBuilder = this.repository.createQueryBuilder();

    if (orKeyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`keyword_${index}`] = !Array.isArray(orKeyword)
            ? `%${orKeyword}%`
            : `%${orKeyword[index]}%`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `market_item.${item}` : item
            } as text) ilike :keyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchOrBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchOrBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`keyword_${index}`] = !Array.isArray(orKeyword)
                ? `%${orKeyword}%`
                : `%${orKeyword[index]}%`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `market_item.${item}` : item
                } as text) ilike :keyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    // search ilike
    if (andKeyword) {
      if (searchAndBy) {
        searchAndBy.forEach((item, index) => {
          const whereParams = {};
          whereParams[`equalKeyword_${index}`] = !Array.isArray(andKeyword)
            ? `${andKeyword}`
            : `${andKeyword[index]}`;

          queryBuilder.andWhere(
            `cast(${
              !item.includes('.') ? `market_item.${item}` : item
            } as text) ilike :andKeyword_${index} `,
            whereParams,
          );
        });
      }

      if (searchOrBy) {
        queryBuilder.andWhere(
          new Brackets((subQuery) => {
            searchOrBy.forEach((item, index) => {
              const whereParams = {};
              whereParams[`andKeyword${index}`] = !Array.isArray(andKeyword)
                ? `${andKeyword}`
                : `${andKeyword[index]}`;

              subQuery.orWhere(
                `cast(${
                  !item.includes('.') ? `market_item.${item}` : item
                } as text) ilike :andKeyword_${index} `,
                whereParams,
              );
            });
          }),
        );
      }
    }

    const [items, total] = await queryBuilder
      .orderBy(`lesson.${sortBy}`, sortOrder)
      .take(isGetAll ? null : limit)
      .skip(isGetAll ? null : (page - 1) * limit)
      .getManyAndCount();

    return {
      items,
      total,
    };
  }

  async findOneBy(
    query: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<T | null> {
    return this.repository.findOneBy(query);
  }

  async findById(id: string): Promise<T> {
    return await this.repository.findOneBy({ id } as FindOptionsWhere<T>);
  }

  async findMany(filter: FindManyOptions<T>) {
    return await this.repository.find(filter);
  }

  async create(createDto: any): Promise<T> {
    const newRecord = await this.repository.create(createDto as T);
    return this.repository.save(newRecord);
  }

  async update(id: string, updateDto: any): Promise<T> {
    try {
      const foundRecord = await this.findById(id);

      if (!foundRecord) {
        throw { message: `${this.name} is not found.` };
      }

      const updateObj = { ...foundRecord, ...updateDto };
      await this.repository.update(id, updateObj);

      return updateObj;
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  async remove(id: string): Promise<DeleteResult> {
    try {
      const foundRecord = await this.findById(id);

      if (!foundRecord) {
        throw { message: `${this.name} is not found.` };
      }

      return await this.repository.softDelete(id);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}

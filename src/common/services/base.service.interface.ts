import {
  UpdateResult,
  DeleteResult,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
} from 'typeorm';
import { FilterDto } from '../dto/filter.dto';
import { FindAllResponse } from '../responses/find-all.response';

export interface Write<T> {
  create(item: T): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  remove(id: string): Promise<DeleteResult>;
}

export interface Read<T> {
  findAll(filterDto: FilterDto): Promise<FindAllResponse<T>>;
  findById(id: string): Promise<T>;
  findMany(filter: FindManyOptions<T>): Promise<Array<T>>;
  findOneBy(
    query: FindOptionsWhere<T> | FindOptionsWhere<T>[],
  ): Promise<T | null>;
}

export interface BaseServiceInterface<T> extends Write<T>, Read<T> {}

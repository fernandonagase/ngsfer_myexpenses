import type { IServiceResult } from './IServiceResult'

interface IServiceListOptions {
  relations: string[]
}

interface IService<T> {
  list(options?: IServiceListOptions): Promise<IServiceResult<T[]>>
  findBy(id: number): Promise<IServiceResult<T>>
  insert(entity: Omit<T, 'id'>): Promise<IServiceResult<T>>
  update(entity: T): Promise<IServiceResult<T>>
  remove(id: number): Promise<IServiceResult<void>>
}

export type { IService, IServiceListOptions }

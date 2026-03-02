import type { IServiceResult } from './IServiceResult'

interface IService<T> {
  list(): Promise<IServiceResult<T[]>>
  findBy(id: number): Promise<IServiceResult<T>>
  insert(entity: Omit<T, 'id'>): Promise<IServiceResult<T>>
  update(id: number, entity: Omit<T, 'id'>): Promise<IServiceResult<T>>
  remove(id: number): Promise<IServiceResult<void>>
}

export type { IService }

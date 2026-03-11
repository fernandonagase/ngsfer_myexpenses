import type { IServiceResult } from './IServiceResult'

export type IServiceListFilters = Partial<{
  isActive: boolean
}>

interface IServiceListOptions {
  relations?: string[]
  filters?: IServiceListFilters
}

type WithRequiredId<T extends { id?: unknown }> = Omit<T, 'id'> & { id: NonNullable<T['id']> }

interface IService<T extends { id?: unknown }> {
  list(options?: IServiceListOptions): Promise<IServiceResult<WithRequiredId<T>[]>>
  findBy(id: number): Promise<IServiceResult<T>>
  insert(entity: Omit<T, 'id'>): Promise<IServiceResult<T>>
  update(entity: T): Promise<IServiceResult<T>>
  remove(id: number): Promise<IServiceResult<void>>
}

export type { IService, IServiceListOptions, WithRequiredId }

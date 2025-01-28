interface IServiceResult<T> {
  ok: boolean
  message?: string
  payload?: T
}

export type { IServiceResult }

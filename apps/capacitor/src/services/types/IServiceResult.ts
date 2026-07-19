interface IServiceResultOk<T> {
  ok: true
  payload: T
}

interface IServiceResultError {
  ok: false
  message: string
}

type IServiceResult<T> = IServiceResultOk<T> | IServiceResultError

export type { IServiceResult, IServiceResultOk, IServiceResultError }

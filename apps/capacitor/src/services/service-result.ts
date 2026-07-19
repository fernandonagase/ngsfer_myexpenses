import type { IServiceResultError, IServiceResultOk } from './types/IServiceResult'

export class ServiceResult {
  static ok<T>(payload: T): IServiceResultOk<T> {
    const result: IServiceResultOk<T> = { ok: true, payload }
    return result
  }

  static error(error: unknown): IServiceResultError {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

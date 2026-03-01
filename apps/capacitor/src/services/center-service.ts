import {
  findCenterById,
  getAllCenters,
  insertCenter,
  removeCenterById,
  updateCenter,
} from 'src/persistence/myExpensesDao'
import type { ICentroFinanceiro } from './types/ICentroFinanceiro'
import type { IService } from './types/IService'
import { getErrorMessage } from 'src/helpers/error-handling'

const centerService: IService<ICentroFinanceiro> = {
  async list() {
    try {
      const centers = await getAllCenters()
      return { ok: true, payload: centers }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    }
  },
  async findBy(id) {
    try {
      const center = await findCenterById(id)
      return { ok: true, payload: center }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    }
  },
  async insert(entity) {
    try {
      await insertCenter(entity)
      // id precisa ser devolvido do insertCenter, que, por sua vez, precisa receber do save
      return { ok: true, payload: { id: -1, ...entity } }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    }
  },
  async update(id, entity) {
    try {
      await updateCenter(id, entity)
      return { ok: true, payload: { id, ...entity } }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    }
  },
  async remove(id) {
    try {
      await removeCenterById(id)
      return { ok: true }
    } catch (error) {
      return { ok: false, message: getErrorMessage(error) }
    }
  },
}

export { centerService }

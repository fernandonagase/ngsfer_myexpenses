import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

import {
  addUpgradeStatement,
  findAll,
  findOneBy,
  openDatabase,
  removeBy,
  save,
} from './sqliteManager'
import { upgrades } from './upgrades/ngsfer_myexpenses-upgrade'
import type { CentroFinanceiro } from './types/myExpenses.types'

let myExpensesConnection: SQLiteDBConnection
const DB_NAME = 'ngsfer_myexpenses'

async function initialize() {
  await addUpgradeStatement({ database: DB_NAME, upgrade: upgrades })
  myExpensesConnection = await openDatabase(DB_NAME, false, 'no-encryption', 1, false)
}

async function insertCenter(center: Omit<CentroFinanceiro, 'id'>) {
  await save(myExpensesConnection, 'centro_financeiro', center)
}

async function updateCenter(centerId: number, center: Omit<CentroFinanceiro, 'id'>) {
  await save(myExpensesConnection, 'centro_financeiro', center, { id: centerId.toString() })
}

async function findCenterById(id: number) {
  return await findOneBy(myExpensesConnection, 'centro_financeiro', ['id', 'nome'], {
    id: id.toString(),
  })
}

async function getAllCenters() {
  return await findAll(myExpensesConnection, 'centro_financeiro', ['id', 'nome'])
}

async function removeCenterById(centerId: number) {
  await removeBy(myExpensesConnection, 'centro_financeiro', { id: centerId.toString() })
}

export { initialize, insertCenter, updateCenter, findCenterById, getAllCenters, removeCenterById }

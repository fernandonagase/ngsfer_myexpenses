import { DataSource, type DataSourceOptions } from 'typeorm'

import sqliteParams from '../sqliteParams'

import * as entities from '../entities/expenses'
import * as migrations from '../migrations/expenses'

const dbName = 'ngsfer_myexpenses'

const dataSourceConfig: DataSourceOptions = {
  type: 'capacitor',
  driver: sqliteParams.connection,
  database: dbName,
  mode: 'no-encryption',
  entities,
  migrations, //["../migrations/expenses/*{.ts,.js}"]
  subscribers: [],
  logging: [/*'query',*/ 'error', 'schema'],
  synchronize: false,
  migrationsRun: false,
}

const expensesDataSource = {
  dataSource: new DataSource(dataSourceConfig),
  dbName: dbName,
}

async function initializeDataSource() {
  await expensesDataSource.dataSource.initialize()
}

async function destroyDataSource() {
  await expensesDataSource.dataSource.destroy()
  try {
    await sqliteParams.connection.closeConnection(dbName, false)
  } catch (error) {
    console.error(error)
    console.warn(`Conexão com o nome ${dbName} já estava fechada`)
  }
}

export async function actWithDbConnectionStopped(callbackFn: () => Promise<void>) {
  await destroyDataSource()
  try {
    await callbackFn()
  } finally {
    await initializeDataSource()
  }
}

export default expensesDataSource

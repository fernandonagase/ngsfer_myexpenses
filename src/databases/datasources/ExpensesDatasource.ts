import { DataSource, type DataSourceOptions } from 'typeorm'

import sqliteParams from '../sqliteParams'
import * as entities from '../entities/expenses'
import * as migrations from '../migrations/expenses'

const dbName = 'ngsfer_myexpenses'

const dataSourceConfig: DataSourceOptions = {
  name: 'expensesConnection',
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
export const dataSourceExpenses = new DataSource(dataSourceConfig)
const expensesDataSource = {
  dataSource: dataSourceExpenses,
  dbName: dbName,
}

export default expensesDataSource

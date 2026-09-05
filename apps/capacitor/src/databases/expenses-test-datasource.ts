import { DataSource, type DataSourceOptions } from 'typeorm'

import * as entities from './entities/expenses'
import * as migrations from './migrations/expenses'

/**
 * DataSource `sqlite` em memória, com as mesmas `entities`/`migrations` do
 * app, usado por testes de integração que precisam de um SQLite real (T2/T4/T5).
 * Roda a cadeia completa de migrações antes de devolver o DataSource pronto.
 */
export async function createInMemoryExpensesDataSource(): Promise<DataSource> {
  const dataSourceConfig: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    entities,
    migrations,
    synchronize: false,
    migrationsRun: false,
  }

  const dataSource = new DataSource(dataSourceConfig)
  await dataSource.initialize()
  await dataSource.runMigrations()
  return dataSource
}

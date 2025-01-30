import 'reflect-metadata'
import { defineBoot } from '#q-app/wrappers'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import sqliteParams from 'src/databases/sqliteParams'

const initializeDataSources = async () => {
  //check sqlite connections consistency
  await sqliteParams.connection.checkConnectionsConsistency().catch((e) => {
    console.error(e)
    return {}
  })

  // Loop through the DataSources
  for (const mDataSource of [expensesDataSource]) {
    // initialize
    await mDataSource.dataSource.initialize()
    if (mDataSource.dataSource.isInitialized) {
      // run the migrations
      await mDataSource.dataSource.runMigrations()
    }
  }
}

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(async (/* { app, router, ... } */) => {
  await initializeDataSources()
})

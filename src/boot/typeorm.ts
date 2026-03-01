import 'reflect-metadata'
import { defineBoot } from '#q-app/wrappers'
import { JeepSqlite } from 'jeep-sqlite/dist/components/jeep-sqlite'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import sqliteParams from 'src/databases/sqliteParams'

customElements.define('jeep-sqlite', JeepSqlite)

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
  if (sqliteParams.platform !== 'web') {
    try {
      await initializeDataSources()
    } catch (error) {
      console.error(error)
      throw error
    }
  } else {
    const jeepEl = document.createElement('jeep-sqlite')
    document.body.appendChild(jeepEl)
    await customElements
      .whenDefined('jeep-sqlite')
      .then(async () => {
        await sqliteParams.connection.initWebStore()
        await initializeDataSources()
      })
      .catch((err) => {
        console.error(`Error: ${err}`)
        throw new Error(`Error: ${err}`)
      })
  }
})

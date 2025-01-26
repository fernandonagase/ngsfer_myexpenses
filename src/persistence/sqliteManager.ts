import type { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { SQLiteConnection } from '@capacitor-community/sqlite'
import { CapacitorSQLite } from '@capacitor-community/sqlite'

const sqlitePlugin = CapacitorSQLite
const sqliteConnection = new SQLiteConnection(sqlitePlugin)

async function openDatabase(
  dbName: string,
  encrypted: boolean,
  mode: string,
  version: number,
  readonly: boolean,
) {
  let db: SQLiteDBConnection
  const retCC = (await sqliteConnection.checkConnectionsConsistency()).result
  const isConn = (await sqliteConnection.isConnection(dbName, readonly)).result
  if (retCC && isConn) {
    db = await sqliteConnection.retrieveConnection(dbName, readonly)
  } else {
    db = await sqliteConnection.createConnection(dbName, encrypted, mode, version, readonly)
  }
  await db.open()
  return db
}

export { openDatabase }

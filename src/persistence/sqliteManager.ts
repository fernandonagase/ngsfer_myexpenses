import type { SQLiteDBConnection, capSQLiteUpgradeOptions } from '@capacitor-community/sqlite'
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

async function addUpgradeStatement(options: capSQLiteUpgradeOptions) {
  await sqlitePlugin.addUpgradeStatement(options)
}

async function save(
  database: SQLiteDBConnection,
  table: string,
  entity: Record<string, unknown>,
  where?: Record<string, string>,
) {
  const keys = Object.keys(entity)
  const values = Object.values(entity)
  let stmt = ''
  if (!where) {
    // INSERT
    const qMarks = keys.map(() => '?')
    stmt = `INSERT INTO ${table} (${keys.toString()}) VALUES (${qMarks.toString()});`
  } else {
    // UPDATE
    const whereKeys = Object.keys(where)
    if (whereKeys.length === 0) {
      return Promise.reject(new Error('save: update no WHERE'))
    }
    // Verificado que whereKeys tem pelo menos uma chave
    const wKey: string = whereKeys[0]!

    const setString = keys.map((key) => `${key} = ?`).join(', ')
    if (setString.length === 0) {
      return Promise.reject(new Error('save: update no SET'))
    }
    stmt = `UPDATE ${table} SET ${setString} WHERE ${wKey}=${where[wKey]}`
  }
  const ret = await database.run(stmt, values)
  if (ret.changes!.changes != 1) {
    return Promise.reject(new Error('save: insert changes != 1'))
  }
  return
}

async function findAll(database: SQLiteDBConnection, table: string, values: string[]) {
  const stmt: string = `SELECT ${values.toString()} FROM ${table};`
  const retValues = (await database.query(stmt)).values ?? []
  return retValues
}

async function findOneBy(
  database: SQLiteDBConnection,
  table: string,
  values: string[],
  where: Record<string, string>,
) {
  const whereKeys = Object.keys(where)
  if (whereKeys.length === 0) {
    return Promise.reject(new Error('save: update no WHERE'))
  }
  // Verificado que whereKeys tem pelo menos uma chave
  const key: string = whereKeys[0]!
  const stmt: string = `SELECT ${values.toString()} FROM ${table} WHERE ${key}=${where[key]};`
  const retValues = (await database.query(stmt)).values
  const ret = retValues!.length > 0 ? retValues![0] : null
  return ret
}

async function removeBy(
  database: SQLiteDBConnection,
  table: string,
  where: Record<string, string>,
) {
  const whereKeys = Object.keys(where)
  if (whereKeys.length === 0) {
    return Promise.reject(new Error('save: update no WHERE'))
  }
  // Verificado que whereKeys tem pelo menos uma chave
  const key: string = whereKeys[0]!
  const stmt: string = `DELETE FROM ${table} WHERE ${key}=${where[key]};`
  await database.run(stmt)
}

export { openDatabase, addUpgradeStatement, save, findAll, findOneBy, removeBy }

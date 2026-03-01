import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'

const sqlitePlugin = CapacitorSQLite
const sqliteConnection = new SQLiteConnection(sqlitePlugin)
const platform = Capacitor.getPlatform()
const sqliteParams = {
  connection: sqliteConnection,
  plugin: sqlitePlugin,
  platform: platform,
}
export default sqliteParams

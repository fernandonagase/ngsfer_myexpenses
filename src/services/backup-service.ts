import { Directory, Filesystem } from '@capacitor/filesystem'

async function backup() {
  try {
    await Filesystem.copy({
      from: 'file:///data/data/com.ngsfer.myexpenses/databases/ngsfer_myexpensesSQLite.db',
      to: 'ngsfer_myexpensesSQLite.db',
      toDirectory: Directory.Documents,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export { backup }

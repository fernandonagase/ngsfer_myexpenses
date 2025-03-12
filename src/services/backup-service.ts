import { Directory, Filesystem } from '@capacitor/filesystem'

async function backup() {
  await Filesystem.copy({
    from: 'file:///data/data/com.ngsfer.myexpenses/databases/ngsfer_myexpensesSQLite.db',
    to: 'ngsfer_myexpensesSQLite.db',
    toDirectory: Directory.Documents,
  })
}

export { backup }

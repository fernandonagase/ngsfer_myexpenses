import { Directory, Filesystem } from '@capacitor/filesystem'
import { FilePicker } from '@capawesome/capacitor-file-picker'

const PATH_DATABASE = 'file:///data/data/com.ngsfer.myexpenses/databases'

async function pathExists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({ path })
    return true
  } catch {
    return false
  }
}

async function getAvailableFilePath(basePath: string): Promise<string> {
  if (!(await pathExists(basePath))) return basePath
  const lastSlash = basePath.lastIndexOf('/')
  const dir = lastSlash >= 0 ? basePath.substring(0, lastSlash) : ''
  const filename = lastSlash >= 0 ? basePath.substring(lastSlash + 1) : basePath
  const dotIndex = filename.lastIndexOf('.')
  const name = dotIndex >= 0 ? filename.substring(0, dotIndex) : filename
  const ext = dotIndex >= 0 ? filename.substring(dotIndex) : ''
  let i = 1
  while (true) {
    const candidate = `${dir}/${name}(${i})${ext}`
    const exists = await pathExists(candidate)
    if (!exists) return candidate
    i++
  }
}

async function backup() {
  try {
    await Filesystem.copy({
      from: `${PATH_DATABASE}/ngsfer_myexpensesSQLite.db`,
      to: 'ngsfer_myexpensesSQLite.db',
      toDirectory: Directory.Documents,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

async function importBackup() {
  const result = await FilePicker.pickFiles({
    limit: 1,
    types: ['application/vnd.sqlite3', 'application/x-sqlite3', 'application/octet-stream'],
  })
  const file = result.files[0]

  const baseOldPath = `${PATH_DATABASE}/ngsfer_myexpensesSQLite.OLD.db`
  const uniqueOldPath = await getAvailableFilePath(baseOldPath)
  await Filesystem.rename({
    from: `${PATH_DATABASE}/ngsfer_myexpensesSQLite.db`,
    to: uniqueOldPath,
  })
  try {
    if (file?.path) {
      await Filesystem.copy({
        from: file.path,
        to: `${PATH_DATABASE}/ngsfer_myexpensesSQLite.db`,
      })
    }
  } catch (error) {
    await Filesystem.rename({
      from: uniqueOldPath,
      to: `${PATH_DATABASE}/ngsfer_myexpensesSQLite.db`,
    })
    throw new Error('Erro ao importar backup. Restauração realizada.', { cause: error })
  }
}

export { backup, importBackup }

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repoRoot = resolve(process.cwd(), '../..')

const read = (relative: string) => readFileSync(resolve(repoRoot, relative), 'utf8')
const readJson = (relative: string) => JSON.parse(read(relative)) as Record<string, unknown>
const exists = (relative: string) => existsSync(resolve(repoRoot, relative))

const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

const STRINGS_XML = 'apps/capacitor/src-capacitor/android/app/src/main/res/values/strings.xml'
const BUILD_GRADLE = 'apps/capacitor/src-capacitor/android/app/build.gradle'
const MAIN_ACTIVITY =
  'apps/capacitor/src-capacitor/android/app/src/main/java/com/ngsfer/myexpenses/MainActivity.java'
const BACKUP_SERVICE = 'apps/capacitor/src/services/backup-service.ts'
const DATASOURCE = 'apps/capacitor/src/databases/datasources/ExpensesDatasource.ts'
const LEGACY_DAO = 'apps/capacitor/src/persistence/plumifinDao.ts'
const SETTINGS_PAGE = 'apps/capacitor/src/pages/settings/SettingsPage.vue'
const CAPACITOR_CONFIG = 'apps/capacitor/src-capacitor/capacitor.config.json'

// Este arquivo assevera os literais de identidade, então necessariamente os contém: ele se
// exclui das duas varreduras. A lacuna é conhecida e estreita — um resíduo escondido aqui dentro
// não é pego por elas.
const SELF = 'apps/capacitor/src/branding.test.ts'

// Os únicos arquivos autorizados a conter `myexpenses`: identidade do app no Android e nome do
// banco. Renomear qualquer um deles troca o applicationId ou deixa o banco existente órfão.
const IDENTITY_FILES = [
  BUILD_GRADLE,
  MAIN_ACTIVITY,
  STRINGS_XML,
  CAPACITOR_CONFIG,
  BACKUP_SERVICE,
  DATASOURCE,
  LEGACY_DAO,
]

describe('nome exibido', () => {
  it('strings.xml expõe Plumifin como rótulo do launcher', () => {
    const xml = read(STRINGS_XML)
    expect(xml).toContain('<string name="app_name">Plumifin</string>')
    expect(xml).toContain('<string name="title_activity_main">Plumifin</string>')
  })

  it('ScopePill usa Plumifin no rótulo estático', () => {
    expect(read('apps/capacitor/src/components/shell/ScopePill.vue')).toContain(
      '<span class="scope-pill__label">Plumifin</span>',
    )
  })

  it('rodapé de versão mostra Plumifin seguido da versão', () => {
    expect(read(SETTINGS_PAGE)).toContain(
      'Plumifin<template v-if="appVersion"> · versão {{ appVersion }}</template>',
    )
  })

  it('rodapé sem versão reduz a Plumifin', () => {
    const block = /<div class="version">\s*([\s\S]*?)\s*<\/div>/.exec(read(SETTINGS_PAGE))
    expect(block).not.toBeNull()
    const semRamoDeVersao = block![1]!.replace(
      /<template v-if="appVersion">[\s\S]*?<\/template>/,
      '',
    )
    expect(semRamoDeVersao.trim()).toBe('Plumifin')
  })

  it('productName é Plumifin e alimenta o title', () => {
    expect(readJson('apps/capacitor/package.json').productName).toBe('Plumifin')
    expect(read('apps/capacitor/index.html')).toContain('<title><%= productName %></title>')
  })

  it('títulos dos documentos usam Plumifin', () => {
    for (const doc of ['apps/capacitor/README.md', 'apps/capacitor/.github/copilot-instructions.md']) {
      const primeiraLinha = read(doc).split('\n')[0] ?? ''
      expect(primeiraLinha).toContain('Plumifin')
      expect(primeiraLinha.toLowerCase()).not.toMatch(/my ?expenses/)
    }
  })
})

describe('identificadores internos', () => {
  it('escopo do workspace é @plumifin', () => {
    expect(readJson('packages/utils/package.json').name).toBe('@plumifin/utils')

    const appPkg = readJson('apps/capacitor/package.json')
    expect(appPkg.name).toBe('@plumifin/capacitor')
    expect((appPkg.dependencies as Record<string, string>)['@plumifin/utils']).toBe('workspace:*')
    expect(readJson('apps/capacitor/src-capacitor/package.json').name).toBe('@plumifin/capacitor')

    const comEscopoAntigo = trackedFiles().filter(
      (file) =>
        !file.startsWith('.specs/') &&
        file !== SELF &&
        read(file).includes('@ngsfer-myexpenses/'),
    )
    expect(comEscopoAntigo).toEqual([])
  })

  it('pacote raiz e appId electron usam plumifin', () => {
    expect(readJson('package.json').name).toBe('ngsfer_plumifin')
    expect(read('apps/capacitor/quasar.config.ts')).toContain("appId: 'ngsfer-plumifin'")
  })

  it('camada legada de persistência foi renomeada', () => {
    for (const file of [
      LEGACY_DAO,
      'apps/capacitor/src/persistence/types/plumifin.types.ts',
      'apps/capacitor/src/persistence/upgrades/plumifin-upgrade.ts',
    ]) {
      expect(exists(file), `${file} deveria existir`).toBe(true)
    }

    expect(read(LEGACY_DAO)).toContain('let plumifinConnection: SQLiteDBConnection')

    const restos = trackedFiles().filter(
      (file) => file.startsWith('apps/capacitor/src/persistence/') && /myexpenses/i.test(file),
    )
    expect(restos).toEqual([])
  })
})

describe('identidade técnica preservada', () => {
  it('identidade Android permanece com.ngsfer.myexpenses', () => {
    const gradle = read(BUILD_GRADLE)
    expect(gradle).toContain('namespace "com.ngsfer.myexpenses"')
    expect(gradle).toContain('applicationId "com.ngsfer.myexpenses"')

    expect(exists(MAIN_ACTIVITY)).toBe(true)
    expect(read(MAIN_ACTIVITY)).toContain('package com.ngsfer.myexpenses;')

    const xml = read(STRINGS_XML)
    expect(xml).toContain('<string name="package_name">com.ngsfer.myexpenses</string>')
    expect(xml).toContain('<string name="custom_url_scheme">com.ngsfer.myexpenses</string>')

    expect(read(BACKUP_SERVICE)).toContain(
      "const PATH_DATABASE = 'file:///data/data/com.ngsfer.myexpenses/databases'",
    )

    expect(readJson(CAPACITOR_CONFIG).appId).toBe('com.ngsfer.myexpenses')
  })

  it('nome do banco permanece ngsfer_myexpenses', () => {
    expect(read(DATASOURCE)).toContain("const dbName = 'ngsfer_myexpenses'")
    expect(read(LEGACY_DAO)).toContain("const DB_NAME = 'ngsfer_myexpenses'")
  })

  it('backup continua operando sobre ngsfer_myexpensesSQLite.db', () => {
    const backup = read(BACKUP_SERVICE)
    expect(backup).toContain("path: 'ngsfer_myexpensesSQLite.db'")
    expect(backup).toContain('${PATH_DATABASE}/ngsfer_myexpensesSQLite.db')
    expect(backup).toContain('${PATH_DATABASE}/ngsfer_myexpensesSQLite.OLD.db')
  })

  it('nenhum resíduo de myexpenses fora da identidade preservada', () => {
    const autorizados = new Set([...IDENTITY_FILES, SELF])
    const residuos = trackedFiles()
      .filter((file) => !file.startsWith('.specs/') && file !== 'pnpm-lock.yaml')
      .filter((file) => !autorizados.has(file))
      .filter((file) => /myexpenses/i.test(file) || /myexpenses/i.test(read(file)))
    expect(residuos).toEqual([])
  })
})

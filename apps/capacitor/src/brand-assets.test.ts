import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inflateSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

const repoRoot = resolve(process.cwd(), '../..')

const abs = (relative: string) => resolve(repoRoot, relative)
const read = (relative: string) => readFileSync(abs(relative), 'utf8')
const readJson = (relative: string) => JSON.parse(read(relative)) as Record<string, unknown>
const exists = (relative: string) => existsSync(abs(relative))
const sha256 = (relative: string) =>
  createHash('sha256').update(readFileSync(abs(relative))).digest('hex')

const RES = 'apps/capacitor/src-capacitor/android/app/src/main/res'
const DENSITIES = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'] as const

// O verde da identidade (`$primary` em src/css/quasar.variables.scss). A WOR-103 propôs #48513a;
// a decisão registrada no plano é manter este valor, o que já estava no código.
const BRAND: Rgba = [0x3a, 0x5a, 0x40, 255]

// ---------------------------------------------------------------------------
// Leitor de PNG mínimo
//
// O projeto não tem biblioteca de imagem e não vale adicionar uma só para estes testes. Isto lê
// o IHDR (dimensão) e descomprime os IDAT desfazendo os filtros por linha, o bastante para
// amostrar um pixel. Cobre os três color types que os geradores produzem aqui: 2 (RGB, saída do
// @capacitor/assets para splash), 6 (RGBA, saída para os mipmaps) e 3 (paletizado, saída do
// IconGenie depois do pngquant). Bit depth 8 em todos; qualquer outra combinação lança, para que
// um formato inesperado apareça como falha e não como pixel errado lido em silêncio.
// ---------------------------------------------------------------------------

type Rgba = [number, number, number, number]

interface Png {
  width: number
  height: number
  pixel: (x: number, y: number) => Rgba
}

function readPng(relative: string): Png {
  const buf = readFileSync(abs(relative))
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  const bitDepth = buf[24]
  const colorType = buf[25]

  if (bitDepth !== 8) throw new Error(`${relative}: bit depth ${bitDepth} não suportado`)
  if (![2, 3, 6].includes(colorType))
    throw new Error(`${relative}: color type ${colorType} não suportado`)

  let palette: Buffer | undefined
  let alphas: Buffer | undefined
  const idat: Buffer[] = []

  for (let pos = 8; pos + 8 <= buf.length; ) {
    const length = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + length)
    if (type === 'PLTE') palette = data
    else if (type === 'tRNS') alphas = data
    else if (type === 'IDAT') idat.push(data)
    pos += 12 + length
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idat))
  const rows: Buffer[] = []
  let previous = Buffer.alloc(stride)
  let offset = 0

  for (let y = 0; y < height; y++) {
    const filter = raw[offset++]!
    const line = Buffer.from(raw.subarray(offset, offset + stride))
    offset += stride

    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? line[i - channels]! : 0
      const b = previous[i]!
      const c = i >= channels ? previous[i - channels]! : 0
      const v = line[i]!
      if (filter === 1) line[i] = (v + a) & 0xff
      else if (filter === 2) line[i] = (v + b) & 0xff
      else if (filter === 3) line[i] = (v + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        line[i] = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      }
    }

    rows.push(line)
    previous = line
  }

  const pixel = (x: number, y: number): Rgba => {
    const row = rows[y]!
    if (colorType === 3) {
      const index = row[x]!
      const p = palette!
      return [p[index * 3]!, p[index * 3 + 1]!, p[index * 3 + 2]!, alphas?.[index] ?? 255]
    }
    const o = x * channels
    // Color type 2 não tem canal alfa: por definição é opaco.
    return [row[o]!, row[o + 1]!, row[o + 2]!, colorType === 6 ? row[o + 3]! : 255]
  }

  return { width, height, pixel }
}

describe('ícone do launcher', () => {
  it('foreground do ícone adaptativo existe nas 6 densidades', () => {
    // Tamanhos do template de ícone adaptativo do @capacitor/assets (108dp por densidade).
    const sides: Record<string, number> = {
      ldpi: 81,
      mdpi: 108,
      hdpi: 162,
      xhdpi: 216,
      xxhdpi: 324,
      xxxhdpi: 432,
    }

    for (const density of DENSITIES) {
      const path = `${RES}/mipmap-${density}/ic_launcher_foreground.png`
      expect(exists(path), path).toBe(true)
      const png = readPng(path)
      expect([density, png.width, png.height]).toEqual([density, sides[density], sides[density]])
    }
  })

  it('background do ícone adaptativo é o verde da identidade', () => {
    for (const density of DENSITIES) {
      const path = `${RES}/mipmap-${density}/ic_launcher_background.png`
      expect(exists(path), path).toBe(true)
      const png = readPng(path)
      const center = png.pixel(png.width >> 1, png.height >> 1)
      expect([density, ...center]).toEqual([density, ...BRAND])
    }
  })

  it('XML do ícone adaptativo aponta para os dois mipmaps', () => {
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      const xml = read(`${RES}/mipmap-anydpi-v26/${name}`)
      expect(xml, name).toContain('<adaptive-icon')
      expect(xml, name).toContain('android:drawable="@mipmap/ic_launcher_background"')
      expect(xml, name).toContain('android:drawable="@mipmap/ic_launcher_foreground"')
      // O background não pode voltar a ser a cor do template: era @color/ic_launcher_background,
      // o recurso branco que deixava a pena off-white invisível (contraste 1,10:1).
      expect(xml, name).not.toContain('@color/ic_launcher_background')
    }
  })

  // ACs 4 e 5 asseveram AUSÊNCIA de cor de fundo, e isso é deliberado: o @capacitor/assets 3.0.5
  // preenche o ícone legado com transparência (dist/platforms/android/index.js:180-186) e nunca
  // aplica --iconBackgroundColor ali. Em API 23-25 (minSdkVersion = 23) a pena aparece sobre o
  // papel de parede, sem o verde. A lacuna é aceita e está registrada no plano e no README; se a
  // ferramenta passar a preencher o fundo, estes dois testes quebram — e devem quebrar, porque aí
  // a decisão de aceitar merece ser revista.
  it('ícone legado sai transparente nas 6 densidades', () => {
    const sides: Record<string, number> = {
      ldpi: 36,
      mdpi: 48,
      hdpi: 72,
      xhdpi: 96,
      xxhdpi: 144,
      xxxhdpi: 192,
    }

    for (const density of DENSITIES) {
      const path = `${RES}/mipmap-${density}/ic_launcher.png`
      expect(exists(path), path).toBe(true)
      const png = readPng(path)
      expect([density, png.width, png.height]).toEqual([density, sides[density], sides[density]])
      expect([density, png.pixel(0, 0)[3]]).toEqual([density, 0])
    }
  })

  it('ícone redondo legado sai transparente nas 6 densidades', () => {
    for (const density of DENSITIES) {
      const path = `${RES}/mipmap-${density}/ic_launcher_round.png`
      expect(exists(path), path).toBe(true)
      expect([density, readPng(path).pixel(0, 0)[3]]).toEqual([density, 0])
    }
  })

  it('resíduos do template do Capacitor foram removidos', () => {
    // Os três ficam órfãos quando o ícone adaptativo passa a referenciar os mipmaps. O primeiro é
    // pior que órfão: define o recurso `ic_launcher_background` como a cor branca.
    for (const residue of [
      `${RES}/values/ic_launcher_background.xml`,
      `${RES}/drawable/ic_launcher_background.xml`,
      `${RES}/drawable-v24/ic_launcher_foreground.xml`,
    ]) {
      expect(exists(residue), residue).toBe(false)
    }
  })
})

describe('splash de abertura', () => {
  const splashDirs = (nightly: boolean) => {
    const night = nightly ? '-night' : ''
    const dirs = [`drawable${night}`]
    for (const orientation of ['port', 'land']) {
      for (const density of DENSITIES) dirs.push(`drawable-${orientation}${night}-${density}`)
    }
    return dirs
  }

  it('splash clara cobre as 13 variantes com o verde', () => {
    const dirs = splashDirs(false)
    expect(dirs).toHaveLength(13)

    for (const dir of dirs) {
      const path = `${RES}/${dir}/splash.png`
      expect(exists(path), path).toBe(true)
      expect([dir, ...readPng(path).pixel(0, 0)]).toEqual([dir, ...BRAND])
    }
  })

  it('splash escura cobre as 13 variantes com o mesmo verde', () => {
    const dirs = splashDirs(true)
    expect(dirs).toHaveLength(13)

    for (const dir of dirs) {
      const path = `${RES}/${dir}/splash.png`
      expect(exists(path), path).toBe(true)
      // Sem --splashBackgroundColorDark o default do @capacitor/assets é #111111, que daria uma
      // splash quase preta. A decisão registrada é identidade única nos dois temas.
      expect([dir, ...readPng(path).pixel(0, 0)]).toEqual([dir, ...BRAND])
    }
  })

  it('tema de abertura continua apontando para o drawable splash', () => {
    const xml = read(`${RES}/values/styles.xml`)
    expect(xml).toContain('<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">')
    expect(xml).toContain('<item name="android:background">@drawable/splash</item>')
  })

  it('plugin de splash e gerador entram no package.json nativo', () => {
    const pkg = readJson('apps/capacitor/src-capacitor/package.json')
    const deps = pkg.dependencies as Record<string, string>
    const devDeps = pkg.devDependencies as Record<string, string>

    expect(devDeps['@capacitor/assets']).toBeDefined()
    // O IconGenie instala a última versão do plugin, que hoje é a 8.x e exige
    // @capacitor/core >= 8.0.0 — peer quebrado, porque o projeto está na linha 7. A faixa precisa
    // acompanhar o core.
    expect(deps['@capacitor/splash-screen']).toMatch(/^\^7\./)
    expect(deps['@capacitor/core']).toMatch(/^\^7\./)
  })
})

describe('favicon web', () => {
  // SHA-256 dos ícones de template do Quasar, capturados antes da regeneração. A afirmação é que
  // os arquivos mudaram; fixar o hash anterior é o que impede o teste de passar num repositório
  // onde a regeneração nunca rodou.
  const TEMPLATE_HASHES: Record<string, string> = {
    'apps/capacitor/public/icons/favicon-16x16.png':
      'df29c1147263c1a50529c6550b6ac1b36edbf36afae1d99cbdf173128e76fac5',
    'apps/capacitor/public/icons/favicon-32x32.png':
      '96119764ea8886370a0f29a66caca8e26ad598a634e792cc0f918ef5e5b64239',
    'apps/capacitor/public/icons/favicon-96x96.png':
      'd0f6cfe58174d551dbc303fccfbcfc8e396d434ab7e370b5c298f15a38f8eeb6',
    'apps/capacitor/public/icons/favicon-128x128.png':
      'ce61a0d27e9167938ce2083e1391de1ee514b40d8a0f5c3602a7a04f449f6779',
    'apps/capacitor/public/favicon.ico':
      'd99709698ff895ee30e4d481cd68da8f7ca4d5f68b017d17aa2a08f938ec71bb',
  }

  it('os quatro favicons PNG foram regenerados', () => {
    for (const size of [16, 32, 96, 128]) {
      const path = `apps/capacitor/public/icons/favicon-${size}x${size}.png`
      expect(exists(path), path).toBe(true)
      const png = readPng(path)
      expect([size, png.width, png.height]).toEqual([size, size, size])
      expect([size, sha256(path)]).not.toEqual([size, TEMPLATE_HASHES[path]])
    }
  })

  it('favicon.ico foi regenerado', () => {
    const path = 'apps/capacitor/public/favicon.ico'
    expect(exists(path)).toBe(true)
    expect(sha256(path)).not.toBe(TEMPLATE_HASHES[path])
  })

  it('index.html referencia os cinco favicons', () => {
    const html = read('apps/capacitor/index.html')
    for (const size of [16, 32, 96, 128]) {
      expect(html, `favicon ${size}`).toContain(
        `<link rel="icon" type="image/png" sizes="${size}x${size}" href="icons/favicon-${size}x${size}.png">`,
      )
    }
    expect(html).toContain('<link rel="icon" type="image/ico" href="favicon.ico">')
  })
})

describe('regeneração reproduzível', () => {
  it('arte-fonte está versionada em 1024x1024 com alfa', () => {
    const path = 'apps/capacitor/app-icon.png'
    expect(exists(path)).toBe(true)
    const png = readPng(path)
    expect([png.width, png.height]).toEqual([1024, 1024])
    // O canto tem de ser transparente: a pena é off-white (#F6F4F0) e só funciona sobre o verde.
    // Uma arte-fonte com fundo opaco produziria um ícone adaptativo com moldura.
    expect(png.pixel(0, 0)[3]).toBe(0)
  })

  it('fontes intermediárias do capacitor-assets estão versionadas', () => {
    const icon = 'apps/capacitor/src-capacitor/assets/icon.png'
    const splash = 'apps/capacitor/src-capacitor/assets/splash.png'
    expect(exists(icon), icon).toBe(true)
    expect(exists(splash), splash).toBe(true)

    const iconPng = readPng(icon)
    expect([iconPng.width, iconPng.height]).toEqual([1024, 1024])

    const splashPng = readPng(splash)
    expect([splashPng.width, splashPng.height]).toEqual([2732, 2732])
    expect(splashPng.pixel(0, 0)).toEqual(BRAND)
  })

  it('README documenta a regeneração e a limitação do ícone legado', () => {
    const readme = read('apps/capacitor/README.md')
    expect(readme).toContain('icongenie generate -m capacitor,spa -i app-icon.png')
    expect(readme).toContain('--splashscreen-color 3a5a40')
    expect(readme).toContain('npx @capacitor/assets generate --android')
    for (const flag of [
      '--iconBackgroundColor',
      '--iconBackgroundColorDark',
      '--splashBackgroundColor',
      '--splashBackgroundColorDark',
    ]) {
      expect(readme, flag).toContain(`${flag} '#3a5a40'`)
    }
    expect(readme).toContain('API 23-25')
  })
})

## Plumifin

Aplicativo mobile para controle de finanças pessoais, com armazenamento local em SQLite e experiência rápida usando Quasar Framework.

### Principais recursos

- Registro de operações/lançamentos por centro e categoria
- Gestão de centros e categorias
- Relatórios e sumários com gráficos (ApexCharts)
- Offline-first com banco local (Capacitor SQLite + TypeORM)

### Stack

- Vue 3 + TypeScript, Pinia, Vue Router
- Quasar 2 (Vite)
- TypeORM + Capacitor Community SQLite
- Day.js, Axios, ApexCharts

## Pré-requisitos

- Node.js LTS (18+ recomendado)
- npm ou yarn
- Para Android: Android Studio + SDK/NDK, Java JDK, dispositivo/emulador configurado

## Instalação

```pwsh
# instalar dependências
npm install
# ou
yarn
```

## Desenvolvimento

Android (Capacitor + device/emulador):

```pwsh
npm run dev:android
# ou
yarn dev:android
```

## Build

Android:

```pwsh
# gerar build para Android via Quasar
quasar build -m capacitor -T android

```

## Ícone e splashscreen

A arte-fonte da marca é `app-icon.png` (PNG 1024×1024 com transparência) na raiz deste app. Todo
ícone e toda splash do projeto derivam dela — não edite os arquivos em
`src-capacitor/android/app/src/main/res/`, eles são gerados e qualquer alteração à mão é desfeita
na próxima regeneração.

Pré-requisito: [Icon Genie](https://quasar.dev/icongenie/introduction), o utilitário recomendado
pelo Quasar. Ele é um CLI próprio, não uma dependência do projeto:

```pwsh
pnpm add -g @quasar/icongenie   # requer Node >= 22
```

Regenerar é um processo de dois passos, e os dois são necessários:

```pwsh
# 1. na raiz deste app — produz src-capacitor/assets/{icon,splash}.png e os favicons web
icongenie generate -m capacitor,spa -i app-icon.png --splashscreen-color 3a5a40

# 2. em src-capacitor/ — gera os recursos Android com as cores da identidade
npx @capacitor/assets generate --android --iconBackgroundColor '#3a5a40' --iconBackgroundColorDark '#3a5a40' --splashBackgroundColor '#3a5a40' --splashBackgroundColorDark '#3a5a40'
```

O segundo passo não é opcional. O Icon Genie encerra chamando `npx @capacitor/assets generate`
**sem flags**, e o default de `--iconBackgroundColor` é `#ffffff`: como a pena é off-white
(`#F6F4F0`), isso produz um ícone de contraste 1,10:1 — branco sobre branco, invisível na gaveta
de aplicativos. As quatro flags acima levam esse contraste para 7,04:1.

**Limitação conhecida (API 23-25).** O `@capacitor/assets` preenche o ícone *legado*
(`mipmap-*/ic_launcher.png`, usado antes do Android 8) com transparência e nunca aplica
`--iconBackgroundColor` ali. Como `minSdkVersion = 23`, em Android 6 e 7 a pena aparece sobre o
papel de parede, sem o verde. A lacuna é aceita: o ícone adaptativo cobre API 26+, que é
praticamente todo aparelho. `src/brand-assets.test.ts` assevera esse comportamento, então se a
ferramenta mudar, o teste avisa.

Se o `sharp` falhar ao instalar em `src-capacitor/`, é o pnpm 10 bloqueando scripts de build — o
`package.json` de lá já traz `pnpm.onlyBuiltDependencies: ["sharp"]` para liberar.

## Lint e Formatação

```pwsh
npm run lint
npm run format
# ou
yarn lint
yarn format
```

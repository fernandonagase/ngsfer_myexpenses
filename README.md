## My Expenses (ngsfer-myexpenses)

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

## Aviso sobre backup

ATENÇÃO: A funcionalidade de backup está parcialmente implementada. Já é possível exportar o banco de dados (gerar um arquivo com os dados), porém a importação/restauração do banco ainda está incompleta e não deve ser utilizada em produção.

## Lint e Formatação

```pwsh
npm run lint
npm run format
# ou
yarn lint
yarn format
```

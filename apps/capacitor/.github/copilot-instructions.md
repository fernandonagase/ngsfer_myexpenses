# Copilot Instructions — ngsfer_myexpenses

## Contexto rápido

- App mobile offline-first de finanças pessoais com Quasar + Vue 3 + TypeScript.
- Persistência principal via SQLite local com TypeORM (`type: capacitor`) e migrations automáticas no boot.
- Idioma da UI e mensagens: português.

## Arquitetura essencial (onde mexer)

- Fluxo principal da UI: `src/layouts/CenterLayout.vue` → `src/components/center/CenterToolbar.vue` → `src/pages/operations/OperationsPage.vue`.
- Estado e regras de negócio ficam nos stores Pinia (`src/stores/*-store.ts`), não nos componentes visuais.
- Persistência ativa do app usa `expensesDataSource` + repositories TypeORM:
  - DataSource: `src/databases/datasources/ExpensesDatasource.ts`
  - Entidades: `src/databases/entities/expenses/*`
  - Migrations: `src/databases/migrations/expenses/*`
- O boot de banco ativo é `src/boot/typeorm.ts` (executa `initialize()` + `runMigrations()`).

## Fluxos e padrões importantes

- Operações financeiras são salvas em centavos (`valueInCents`) e exibidas com helper BRL (`src/helpers/currency.js`).
- Sinal do valor define tipo da operação no formulário (`Entrada`/`Saída`) em `src/components/operation/OperationForm.vue`.
- Resumo mensal é calculado no `operation-store` e agrupado por data (`summaryByMonth`, `monthOperationsSummary`).
- Inativação é soft delete (`is_active`) para centro/operação/categoria; evite exclusão física quando o fluxo existente usa inativação.
- Centros/categorias padrão têm restrições de exclusão já implementadas nos stores.

## Camadas legadas/parciais (atenção)

- Existe uma camada DAO em `src/persistence/*` + `src/services/center-service.ts` que não é o caminho principal das telas atuais.
- `src/boot/initdb.ts` usa DAO legado e não está registrado em `quasar.config.ts`.
- Arquivos de template Quasar ainda existem (`src/pages/IndexPage.vue`, `src/boot/axios.ts` com API example); não use como referência de domínio.

## Workflows de desenvolvimento

- Instalar dependências: `npm install`
- Dev web: `npm run dev`
- Dev Android (Capacitor): `npm run dev:android`
- Build: `npm run build`
- Lint: `npm run lint`
- Formatação: `npm run format`
- `npm test` é placeholder (não há suíte de testes configurada).

## Convenções de implementação neste projeto

- Ao adicionar feature de domínio, priorize: Entity/Migration → Store Pinia → Component/Dialog.
- Mantenha queries complexas no store usando `createQueryBuilder`, como já feito em `center-store` e `operation-store`.
- Use `useQuasar()` para `dialog`, `notify` e `loading` (padrão de interação da UI).
- Preserve nomes de colunas/tabelas existentes em português técnico (`centro_financeiro`, `operacao_financeira`).
- Evite introduzir nova camada de serviço se o fluxo atual já resolve pelo store + repository.

## Backup e integração nativa

- Backup/export/import está em `src/services/backup-service.ts` e é acionado por `src/pages/settings/SettingsPage.vue`.
- Importação de backup precisa parar/reiniciar conexão do TypeORM via `actWithDbConnectionStopped`.
- README registra que restauração/import ainda é funcionalidade sensível; altere com cuidado.

import { describe, expect, it } from 'vitest'
import { DataSource, type DataSourceOptions, type QueryRunner } from 'typeorm'

import * as entities from '../../entities/expenses'
import * as migrations from '../../migrations/expenses'

import { ExpensesOptionalCenter1777000000000 } from './1777000000000-ExpensesOptionalCenter'

// Abordagem A (design.md): o invariante e a migração MIG-01/MIG-02 são
// verificados contra um SQLite real em memória, rodando a cadeia inteira de
// migrações. O pacote `sqlite3` carregou normalmente sob vitest/Node neste
// ambiente, então não é necessário o fallback (abordagem B) descrito no
// design para o caso do módulo nativo não carregar.
//
// `runMigrations()` só executa migrações ainda não registradas na tabela de
// controle do TypeORM; como o objetivo aqui é inserir fixtures *entre* a
// cadeia anterior e esta migração, as migrações anteriores rodam via
// `runMigrations()` normalmente (excluídas desta da lista do DataSource) e
// esta migração roda chamando `up(queryRunner)` diretamente sobre o mesmo
// banco em memória.

const migrationList = Object.values(migrations)
const optionalCenterMigrationName = 'ExpensesOptionalCenter1777000000000'

async function createDataSourceUpToOptionalCenter(): Promise<{
  dataSource: DataSource
  queryRunner: QueryRunner
}> {
  const priorMigrations = migrationList.filter((m) => m.name !== optionalCenterMigrationName)
  const config: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    entities,
    migrations: priorMigrations,
    synchronize: false,
    migrationsRun: false,
  }
  const dataSource = new DataSource(config)
  await dataSource.initialize()
  await dataSource.runMigrations()
  const queryRunner = dataSource.createQueryRunner()
  return { dataSource, queryRunner }
}

describe('ExpensesOptionalCenter1777000000000', () => {
  it('torna o centro opcional, remove o Padrão e preserva os demais registros', async () => {
    const { dataSource, queryRunner } = await createDataSourceUpToOptionalCenter()
    try {
      // Fixture: o centro "Padrão" (criado por 1738628214000) com um
      // lançamento e uma regra recorrente, e um segundo centro com um
      // lançamento.
      const [{ id: defaultCenterId }] = await dataSource.query(
        `SELECT id FROM centro_financeiro WHERE nome = 'Padrão'`,
      )
      await dataSource.query(
        `INSERT INTO centro_financeiro (nome, is_default_center, is_active) VALUES ('Casa', 0, 1)`,
      )
      const [{ id: otherCenterId }] = await dataSource.query(
        `SELECT id FROM centro_financeiro WHERE nome = 'Casa'`,
      )
      await dataSource.query(
        `INSERT INTO category (name, type) VALUES ('Categoria Teste', 'Saída')`,
      )
      const [{ id: categoryId }] = await dataSource.query(
        `SELECT id FROM category WHERE name = 'Categoria Teste'`,
      )

      await dataSource.query(
        `INSERT INTO operacao_financeira (description, valueInCents, date, centro_financeiro_id, category_id)
         VALUES ('Lançamento do Padrão', -1000, '2026-01-01', ?, ?)`,
        [defaultCenterId, categoryId],
      )
      await dataSource.query(
        `INSERT INTO operacao_financeira (description, valueInCents, date, centro_financeiro_id, category_id)
         VALUES ('Lançamento do segundo centro', -2000, '2026-01-02', ?, ?)`,
        [otherCenterId, categoryId],
      )
      await dataSource.query(
        `INSERT INTO recurring_rule (description, valueInCents, type, centro_financeiro_id, category_id, start_date, next_run_date, frequency, anchor_mode, anchor_day)
         VALUES ('Regra do Padrão', -500, 'expense', ?, ?, '2026-01-01', '2026-02-01', 'monthly', 'fixed', 1)`,
        [defaultCenterId, categoryId],
      )

      // Roda a migração desta task sobre esse estado.
      await new ExpensesOptionalCenter1777000000000().up(queryRunner)

      const operations = await dataSource.query(
        `SELECT description, centro_financeiro_id FROM operacao_financeira ORDER BY description`,
      )
      const defaultOp = operations.find((o: { description: string }) =>
        o.description === 'Lançamento do Padrão',
      )
      const otherOp = operations.find((o: { description: string }) =>
        o.description === 'Lançamento do segundo centro',
      )
      expect(defaultOp.centro_financeiro_id).toBeNull()
      expect(otherOp.centro_financeiro_id).toBe(otherCenterId)

      const rules = await dataSource.query(
        `SELECT description, centro_financeiro_id FROM recurring_rule`,
      )
      expect(rules[0].centro_financeiro_id).toBeNull()

      const defaultRow = await dataSource.query(`SELECT * FROM centro_financeiro WHERE nome = 'Padrão'`)
      expect(defaultRow).toHaveLength(0)

      const remainingCenters = await dataSource.query(`SELECT nome FROM centro_financeiro`)
      expect(remainingCenters).toEqual([{ nome: 'Casa' }])

      const columns = await dataSource.query(`SELECT name FROM pragma_table_info('centro_financeiro')`)
      const columnNames = columns.map((c: { name: string }) => c.name)
      expect(columnNames).not.toContain('is_default_center')

      const triggers = await dataSource.query(
        `SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = 'prevent_delete_default_center'`,
      )
      expect(triggers).toHaveLength(0)

      await expect(new ExpensesOptionalCenter1777000000000().down()).rejects.toThrow(
        'Migração irreversível: lançamentos sem centro não têm destino',
      )
    } finally {
      await queryRunner.release()
      await dataSource.destroy()
    }
  })
})

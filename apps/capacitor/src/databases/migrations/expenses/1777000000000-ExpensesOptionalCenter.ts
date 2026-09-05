import type { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Torna `centro_financeiro_id` opcional em `operacao_financeira` e
 * `recurring_rule`, e remove o centro "Padrão" (linha, coluna
 * `is_default_center` e trigger de proteção). Recria as três tabelas via
 * tabelas de backup sem constraints, para não depender de
 * `PRAGMA foreign_keys` (no-op dentro da transação de migração do TypeORM)
 * nem de `ALTER TABLE ... DROP COLUMN` (exige SQLite >= 3.35).
 */
export class ExpensesOptionalCenter1777000000000 implements MigrationInterface {
  name = 'ExpensesOptionalCenter1777000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tabelas de backup sem constraints, com todos os dados atuais.
    await queryRunner.query(
      `CREATE TABLE operacao_financeira_bak AS SELECT * FROM operacao_financeira;`,
    )
    await queryRunner.query(`CREATE TABLE recurring_rule_bak AS SELECT * FROM recurring_rule;`)

    // 2. Lançamentos e regras do centro "Padrão" ficam sem centro.
    await queryRunner.query(
      `UPDATE operacao_financeira_bak SET centro_financeiro_id = NULL
       WHERE centro_financeiro_id IN (SELECT id FROM centro_financeiro WHERE is_default_center = 1);`,
    )
    await queryRunner.query(
      `UPDATE recurring_rule_bak SET centro_financeiro_id = NULL
       WHERE centro_financeiro_id IN (SELECT id FROM centro_financeiro WHERE is_default_center = 1);`,
    )

    // 3. Derruba índices e as tabelas atuais (nenhum DROP acontece enquanto
    // outra tabela com linhas ainda referencia a que está sendo removida).
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operacao_recurring_rule_date;`)
    await queryRunner.query(`DROP INDEX IF EXISTS uq_operacao_generation_key;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recurring_rule_active_next;`)
    await queryRunner.query(`DROP TABLE operacao_financeira;`)
    await queryRunner.query(`DROP TABLE recurring_rule;`)

    // 4. O trigger precisa sumir antes de mexer na linha do Padrão.
    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_delete_default_center;`)

    // 5. Recria centro_financeiro sem is_default_center e sem a linha Padrão.
    await queryRunner.query(
      `CREATE TABLE centro_financeiro_new (
        id INTEGER PRIMARY KEY,
        nome VARCHAR(25) NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
      );`,
    )
    await queryRunner.query(
      `INSERT INTO centro_financeiro_new (id, nome, is_active)
       SELECT id, nome, is_active FROM centro_financeiro WHERE is_default_center = 0;`,
    )
    await queryRunner.query(`DROP TABLE centro_financeiro;`)
    await queryRunner.query(`ALTER TABLE centro_financeiro_new RENAME TO centro_financeiro;`)
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS centro_financeiro_unique_nome ON centro_financeiro(nome);`,
    )

    // 6. Recria recurring_rule com centro_financeiro_id nulável.
    await queryRunner.query(
      `CREATE TABLE recurring_rule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        description TEXT,
        valueInCents INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income','expense')),

        centro_financeiro_id INTEGER,
        category_id INTEGER NOT NULL,

        start_date TEXT NOT NULL,
        next_run_date TEXT NOT NULL,

        frequency TEXT NOT NULL
          CHECK (frequency IN ('monthly', 'weekly', 'yearly')),

        interval INTEGER NOT NULL DEFAULT 1,

        anchor_mode TEXT
          CHECK (anchor_mode IN ('fixed', 'last_day')),
        anchor_day INTEGER,

        end_mode TEXT NOT NULL DEFAULT 'never'
          CHECK (end_mode IN ('never', 'until_date', 'count')),
        end_date TEXT,
        end_count INTEGER,

        is_active INTEGER NOT NULL DEFAULT 1
          CHECK (is_active IN (0,1)),

        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),

        notification_enabled BOOLEAN DEFAULT false,
        notification_days_before INT,
        notification_time TEXT,

        FOREIGN KEY (centro_financeiro_id) REFERENCES centro_financeiro(id),
        FOREIGN KEY (category_id) REFERENCES category(id),

        CHECK (description IS NULL OR length(description) <= 40),

        CHECK (
          frequency <> 'monthly'
          OR (anchor_day IS NOT NULL AND anchor_mode IS NOT NULL)
        ),

        CHECK (
          end_mode <> 'until_date'
          OR end_date IS NOT NULL
        ),

        CHECK (
          end_mode <> 'count'
          OR (end_count IS NOT NULL AND end_count > 0)
        )
      );`,
    )
    await queryRunner.query(
      `INSERT INTO recurring_rule (
        id, description, valueInCents, type, centro_financeiro_id, category_id,
        start_date, next_run_date, frequency, interval, anchor_mode, anchor_day,
        end_mode, end_date, end_count, is_active, created_at, updated_at,
        notification_enabled, notification_days_before, notification_time
      )
      SELECT
        id, description, valueInCents, type, centro_financeiro_id, category_id,
        start_date, next_run_date, frequency, interval, anchor_mode, anchor_day,
        end_mode, end_date, end_count, is_active, created_at, updated_at,
        notification_enabled, notification_days_before, notification_time
      FROM recurring_rule_bak;`,
    )
    await queryRunner.query(
      `CREATE INDEX idx_recurring_rule_active_next
       ON recurring_rule (next_run_date)
       WHERE is_active = 1;`,
    )

    // 7. Recria operacao_financeira com centro_financeiro_id nulável.
    await queryRunner.query(
      `CREATE TABLE operacao_financeira (
        id INTEGER PRIMARY KEY,

        description VARCHAR(50),
        valueInCents INTEGER NOT NULL,
        date TEXT NOT NULL,

        centro_financeiro_id INTEGER,
        category_id INTEGER NOT NULL,

        is_active INTEGER NOT NULL DEFAULT 1,

        generated_at TEXT,
        generation_key TEXT,

        recurring_rule_id INTEGER,

        notes TEXT,

        notification_enabled BOOLEAN DEFAULT false,
        notification_days_before INT,
        notification_time TEXT,

        fatura_cartao_id INTEGER REFERENCES fatura_cartao(id),
        is_invoice_payment BOOLEAN DEFAULT false,

        FOREIGN KEY (centro_financeiro_id)
            REFERENCES centro_financeiro(id),

        FOREIGN KEY (category_id)
            REFERENCES category(id),

        FOREIGN KEY (recurring_rule_id)
            REFERENCES recurring_rule(id)
      );`,
    )
    await queryRunner.query(
      `INSERT INTO operacao_financeira (
        id, description, valueInCents, date, centro_financeiro_id, category_id,
        is_active, generated_at, generation_key, recurring_rule_id, notes,
        notification_enabled, notification_days_before, notification_time,
        fatura_cartao_id, is_invoice_payment
      )
      SELECT
        id, description, valueInCents, date, centro_financeiro_id, category_id,
        is_active, generated_at, generation_key, recurring_rule_id, notes,
        notification_enabled, notification_days_before, notification_time,
        fatura_cartao_id, is_invoice_payment
      FROM operacao_financeira_bak;`,
    )
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operacao_recurring_rule_date
ON operacao_financeira (recurring_rule_id, date);`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_operacao_generation_key
ON operacao_financeira (generation_key);`)

    // 8. Derruba as tabelas de backup.
    await queryRunner.query(`DROP TABLE operacao_financeira_bak;`)
    await queryRunner.query(`DROP TABLE recurring_rule_bak;`)
  }

  public async down(): Promise<void> {
    throw new Error('Migração irreversível: lançamentos sem centro não têm destino')
  }
}

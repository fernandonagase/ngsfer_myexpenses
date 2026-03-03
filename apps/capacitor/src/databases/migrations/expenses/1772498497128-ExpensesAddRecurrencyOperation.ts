import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesAddRecurrencyOperation1772498497128 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE operacao_financeira_new (
    id INTEGER PRIMARY KEY,

    description VARCHAR(50),
    valueInCents INTEGER NOT NULL,
    date TEXT NOT NULL,

    centro_financeiro_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1,

    generated_at TEXT,
    generation_key TEXT,

    recurring_rule_id INTEGER,

    FOREIGN KEY (centro_financeiro_id)
        REFERENCES centro_financeiro(id),

    FOREIGN KEY (category_id)
        REFERENCES category(id),

    FOREIGN KEY (recurring_rule_id)
        REFERENCES recurring_rule(id)
);`,
    )

    await queryRunner.query(
      `INSERT INTO operacao_financeira_new (
    id,
    description,
    valueInCents,
    date,
    centro_financeiro_id,
    category_id,
    is_active
)
SELECT
    id,
    description,
    valueInCents,
    date,
    centro_financeiro_id,
    category_id,
    is_active
FROM operacao_financeira;`,
    )

    await queryRunner.query(`DROP TABLE operacao_financeira;`)

    await queryRunner.query(`ALTER TABLE operacao_financeira_new
RENAME TO operacao_financeira;`)

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_operacao_recurring_rule_date
ON operacao_financeira (recurring_rule_id, date);`)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_operacao_generation_key
ON operacao_financeira (generation_key);`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`PRAGMA foreign_keys = OFF;`)

    await queryRunner.query(`DROP INDEX IF EXISTS idx_operacao_recurring_rule_date;`)
    await queryRunner.query(`DROP INDEX IF EXISTS uq_operacao_generation_key;`)

    await queryRunner.query(`CREATE TABLE operacao_financeira_old (
    id INTEGER PRIMARY KEY,

    description VARCHAR(50),
    valueInCents INTEGER NOT NULL,
    date TEXT NOT NULL,

    centro_financeiro_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1,

    FOREIGN KEY (centro_financeiro_id)
        REFERENCES centro_financeiro(id),

    FOREIGN KEY (category_id)
        REFERENCES category(id)
);`)

    await queryRunner.query(`INSERT INTO operacao_financeira_old (
    id,
    description,
    valueInCents,
    date,
    centro_financeiro_id,
    category_id,
    is_active
)
SELECT
    id,
    description,
    valueInCents,
    date,
    centro_financeiro_id,
    category_id,
    is_active
FROM operacao_financeira;`)

    await queryRunner.query(`DROP TABLE operacao_financeira;`)

    await queryRunner.query(`ALTER TABLE operacao_financeira_old
RENAME TO operacao_financeira;`)

    await queryRunner.query(`PRAGMA foreign_keys = ON;`)
  }
}

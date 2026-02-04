import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCreateRecurrencyRule1770167031707 implements MigrationInterface {
  name = 'ExpensesCreateRecurrencyRule1770167031707'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE recurring_rule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  description TEXT,
  valueInCents INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),

  centro_financeiro_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,

  start_date TEXT NOT NULL,      -- 'YYYY-MM-DD'
  next_run_date TEXT NOT NULL,   -- 'YYYY-MM-DD'

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

  FOREIGN KEY (centro_financeiro_id) REFERENCES centro_financeiro(id),
  FOREIGN KEY (category_id) REFERENCES category(id),

  -- consistência adicional
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
);
`,
    )

    await queryRunner.query(
      `CREATE INDEX idx_recurring_rule_active_next
ON recurring_rule (next_run_date)
WHERE is_active = 1;
`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recurring_rule_active_next;`)
    await queryRunner.query(`DROP TABLE IF EXISTS recurring_rule;`)
  }
}

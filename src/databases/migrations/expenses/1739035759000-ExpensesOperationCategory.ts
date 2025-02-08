import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesOperationCategory1739035759000 implements MigrationInterface {
  name = 'ExpensesOperationCategory1739035759000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE operacao_financeira_new (
        id INTEGER PRIMARY KEY,
        description VARCHAR(50),
        valueInCents INTEGER NOT NULL,
        date TEXT NOT NULL,
        centro_financeiro_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY(centro_financeiro_id) REFERENCES centro_financeiro(id),
        FOREIGN KEY(category_id) REFERENCES category(id)
      );`,
    )
    await queryRunner.query(
      `INSERT INTO operacao_financeira_new (id, description, valueInCents, date, centro_financeiro_id, category_id)
SELECT id, description, valueInCents, date, centro_financeiro_id, 1 FROM operacao_financeira WHERE valueInCents > 0;`,
    )
    await queryRunner.query(
      `INSERT INTO operacao_financeira_new (id, description, valueInCents, date, centro_financeiro_id, category_id)
SELECT id, description, valueInCents, date, centro_financeiro_id, 2 FROM operacao_financeira WHERE valueInCents < 0;`,
    )
    await queryRunner.query(`DROP TABLE operacao_financeira;`)
    await queryRunner.query(`ALTER TABLE operacao_financeira_new RENAME TO operacao_financeira;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operacao_financeira RENAME TO operacao_financeira_new;`)
    await queryRunner.query(
      `CREATE TABLE operacao_financeira (
        id INTEGER PRIMARY KEY,
        description VARCHAR(50),
        valueInCents INTEGER NOT NULL,
        date TEXT NOT NULL,
        centro_financeiro_id INTEGER NOT NULL,
        FOREIGN KEY(centro_financeiro_id) REFERENCES centro_financeiro(id)
      );`,
    )
    await queryRunner.query(`DROP TABLE operacao_financeira_new;`)
  }
}

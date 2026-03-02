import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCreateOperation1738204401000 implements MigrationInterface {
  name = 'ExpensesCreateOperation1738204401000'

  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE operacao_financeira;`)
  }
}

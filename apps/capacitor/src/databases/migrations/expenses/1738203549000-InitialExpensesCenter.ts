import type { MigrationInterface, QueryRunner } from 'typeorm'

export class InitialExpensesCenter1738203549000 implements MigrationInterface {
  name = 'InitialExpensesCenter1738203549000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS centro_financeiro (id INTEGER PRIMARY KEY, nome VARCHAR(25) NOT NULL);`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE centro_financeiro;`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesInitializeCenter1738628214000 implements MigrationInterface {
  name = 'ExpensesInitializeCenter1738628214000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS centro_financeiro_unique_nome
        ON centro_financeiro(nome);`,
    )
    await queryRunner.query(`INSERT INTO centro_financeiro (nome) VALUES ('Padrão');`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM centro_financeiro WHERE nome = 'Padrão';`)
    await queryRunner.query(`DROP INDEX IF EXISTS centro_financeiro_unique_nome;`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesInvoiceReopenedFlag1778000000000 implements MigrationInterface {
  name = 'ExpensesInvoiceReopenedFlag1778000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE fatura_cartao ADD reaberta_para_edicao BOOLEAN NOT NULL DEFAULT false;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE fatura_cartao DROP COLUMN reaberta_para_edicao;`)
  }
}

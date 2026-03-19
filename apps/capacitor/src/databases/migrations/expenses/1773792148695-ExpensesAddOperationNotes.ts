import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesAddOperationNotes1773792148695 implements MigrationInterface {
  name = 'ExpensesAddOperationNotes1773792148695'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operacao_financeira ADD notes TEXT;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operacao_financeira DROP COLUMN notes;`)
  }
}

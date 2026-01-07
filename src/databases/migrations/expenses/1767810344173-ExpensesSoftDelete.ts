import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesSoftDelete1767810344173 implements MigrationInterface {
  name = 'ExpensesSoftDelete1767810344173'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD is_active INTEGER DEFAULT (1) NOT NULL;`,
    )
    await queryRunner.query(
      `ALTER TABLE centro_financeiro ADD is_active INTEGER DEFAULT (1) NOT NULL;`,
    )
    await queryRunner.query(`ALTER TABLE category ADD is_active INTEGER DEFAULT (1) NOT NULL;`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operacao_financeira DROP COLUMN is_active;`)
    await queryRunner.query(`ALTER TABLE centro_financeiro DROP COLUMN is_active;`)
    await queryRunner.query(`ALTER TABLE category DROP COLUMN is_active;`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCenterDefault1738715905000 implements MigrationInterface {
  name = 'ExpensesCenterDefault1738715905000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE centro_financeiro ADD COLUMN is_default_center INTEGER NOT NULL DEFAULT 0;`,
    )
    await queryRunner.query(
      `UPDATE centro_financeiro SET is_default_center = 1 WHERE nome = 'Padrão';`,
    )
    await queryRunner.query(
      `CREATE TRIGGER prevent_delete_default_center BEFORE DELETE ON centro_financeiro FOR EACH ROW WHEN OLD.is_default_center = 1 BEGIN SELECT RAISE(ABORT, 'Não é permitido excluir o centro financeiro padrão'); END;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_delete_default_center;`)
    await queryRunner.query(`ALTER TABLE centro_financeiro DROP COLUMN is_default_center;`)
  }
}

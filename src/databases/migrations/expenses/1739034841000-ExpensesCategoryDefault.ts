import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCategoryDefault1739034841000 implements MigrationInterface {
  name = 'ExpensesCategoryDefault1739034841000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE category ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;`,
    )
    await queryRunner.query(
      `UPDATE category SET is_default = 1 WHERE name IN ('Entrada padrão', 'Saída padrão');`,
    )
    await queryRunner.query(
      `CREATE TRIGGER prevent_delete_default_category BEFORE DELETE ON category FOR EACH ROW WHEN OLD.is_default = 1 BEGIN SELECT RAISE(ABORT, 'Não é permitido excluir uma categoria padrão'); END;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_delete_default_category;`)
    await queryRunner.query(`ALTER TABLE category DROP COLUMN is_default;`)
  }
}

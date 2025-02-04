import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCreateCategory1738629326000 implements MigrationInterface {
  name = 'ExpensesCreateCategory1738629326000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS category (id INTEGER PRIMARY KEY, name VARCHAR(25) NOT NULL, type TEXT NOT NULL CHECK( type IN ('Entrada','Saída') ) DEFAULT 'Saída');`,
    )
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS category_unique_name
        ON category(name);`,
    )
    await queryRunner.query(
      `INSERT INTO category (name, type) VALUES ('Entrada padrão', 'Entrada'), ('Saída padrão', 'Saída');`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE category;`)
    await queryRunner.query(`DROP INDEX IF EXISTS category_unique_name;`)
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesAddNotificationFields1774000000000 implements MigrationInterface {
  name = 'ExpensesAddNotificationFields1774000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD notification_enabled BOOLEAN DEFAULT false;`,
    )
    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD notification_days_before INT;`,
    )
    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD notification_time TEXT;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule ADD notification_enabled BOOLEAN DEFAULT false;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule ADD notification_days_before INT;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule ADD notification_time TEXT;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE operacao_financeira DROP COLUMN notification_time;`,
    )
    await queryRunner.query(
      `ALTER TABLE operacao_financeira DROP COLUMN notification_days_before;`,
    )
    await queryRunner.query(
      `ALTER TABLE operacao_financeira DROP COLUMN notification_enabled;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule DROP COLUMN notification_time;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule DROP COLUMN notification_days_before;`,
    )
    await queryRunner.query(
      `ALTER TABLE recurring_rule DROP COLUMN notification_enabled;`,
    )
  }
}

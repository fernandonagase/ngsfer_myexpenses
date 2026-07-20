import type { MigrationInterface, QueryRunner } from 'typeorm'

import { INVOICE_PAYMENT_CATEGORY_NAME } from '../../entities/expenses/invoice-constants'

export class ExpensesInvoicePaymentCategory1776000000000 implements MigrationInterface {
  name = 'ExpensesInvoicePaymentCategory1776000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE category ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0,1));`,
    )
    // is_default = 0 para não colidir com o trigger prevent_delete_default_category
    // (a proteção contra remoção pelo usuário vem de is_system, que a oculta da UI).
    await queryRunner.query(
      `INSERT INTO category (name, type, is_default, is_active, is_system)
       VALUES (?, 'Saída', 0, 1, 1);`,
      [INVOICE_PAYMENT_CATEGORY_NAME],
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM category WHERE is_system = 1;`)
    await queryRunner.query(`ALTER TABLE category DROP COLUMN is_system;`)
  }
}

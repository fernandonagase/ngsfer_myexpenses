import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpensesCreateCreditCard1775000000000 implements MigrationInterface {
  name = 'ExpensesCreateCreditCard1775000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE cartao_credito (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  dia_fechamento INTEGER NOT NULL CHECK (dia_fechamento >= 1 AND dia_fechamento <= 31),
  dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31),
  limite_em_centavos INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1))
);`,
    )

    await queryRunner.query(
      `CREATE TABLE fatura_cartao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cartao_credito_id INTEGER NOT NULL,
  mes_referencia TEXT NOT NULL,
  data_fechamento TEXT NOT NULL,
  data_vencimento TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada','paga')),
  data_pagamento TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  FOREIGN KEY (cartao_credito_id) REFERENCES cartao_credito(id),
  UNIQUE (cartao_credito_id, mes_referencia)
);`,
    )

    await queryRunner.query(
      `CREATE INDEX idx_fatura_cartao_cartao_mes
ON fatura_cartao (cartao_credito_id, mes_referencia);`,
    )

    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD fatura_cartao_id INTEGER REFERENCES fatura_cartao(id);`,
    )
    await queryRunner.query(
      `ALTER TABLE operacao_financeira ADD is_invoice_payment BOOLEAN DEFAULT false;`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE operacao_financeira DROP COLUMN is_invoice_payment;`)
    await queryRunner.query(`ALTER TABLE operacao_financeira DROP COLUMN fatura_cartao_id;`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_fatura_cartao_cartao_mes;`)
    await queryRunner.query(`DROP TABLE IF EXISTS fatura_cartao;`)
    await queryRunner.query(`DROP TABLE IF EXISTS cartao_credito;`)
  }
}

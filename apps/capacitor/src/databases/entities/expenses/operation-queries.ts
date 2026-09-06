import type { EntityManager } from 'typeorm'

import { applyCenterScope, type CenterScope } from '../../../models/center-scope'

import { Category } from './category'
import { Operation } from './operation'

/** Compras no crédito não entram no saldo/lista de caixa. */
export const EXCLUDE_CARD_PURCHASES =
  'NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)'

/** Saldo de caixa até (e incluindo) `date`, no escopo informado. */
export async function sumCashBalanceUntil(
  manager: EntityManager,
  scope: CenterScope,
  date: string,
): Promise<number> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .select('SUM(operation.valueInCents)', 'total')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  const raw = await qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .andWhere('operation.date <= :date', { date })
    .getRawOne<{ total: number | null }>()
  return raw?.total ?? 0
}

/** Valores de caixa agendados entre `afterDate` (exclusivo) e `untilDate` (inclusivo). */
export async function listScheduledCashValues(
  manager: EntityManager,
  scope: CenterScope,
  afterDate: string,
  untilDate: string,
): Promise<Array<{ valueInCents: number }>> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .select('operation.valueInCents', 'valueInCents')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  return qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .andWhere('operation.date > :afterDate', { afterDate })
    .andWhere('operation.date <= :untilDate', { untilDate })
    .getRawMany<{ valueInCents: number }>()
}

/** Meses (mês/ano) com movimentação de caixa no escopo informado. */
export async function listCashMonths(
  manager: EntityManager,
  scope: CenterScope,
): Promise<Array<{ month: string; year: string }>> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .select("STRFTIME('%m', operation.date)", 'month')
    .addSelect("STRFTIME('%Y', date)", 'year')
  applyCenterScope(qb, scope)
  return qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .groupBy('month')
    .addGroupBy('year')
    .orderBy('year')
    .addOrderBy('month')
    .getRawMany<{ month: string; year: string }>()
}

/**
 * Meses de referência de faturas com compras lançadas no escopo informado, mesmo quando o
 * mês não tem nenhuma outra movimentação de caixa — sem isso, a aba do mês nunca aparece
 * e "Valores agendados" fica sem lugar para ser mostrado.
 */
export async function listInvoiceReferenceMonths(
  manager: EntityManager,
  scope: CenterScope,
): Promise<string[]> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .innerJoin('operation.cardInvoice', 'invoice')
    .select('invoice.mes_referencia', 'referenceMonth')
  applyCenterScope(qb, scope)
  const rows = await qb
    .andWhere('invoice.is_active = 1')
    .andWhere('operation.is_invoice_payment = 0')
    .andWhere('operation.is_active = 1')
    .groupBy('invoice.mes_referencia')
    .getRawMany<{ referenceMonth: string }>()
  return rows.map((row) => row.referenceMonth)
}

/** Saldo de caixa realizado antes do mês informado, no escopo informado. */
export async function sumCashBalanceBeforeMonth(
  manager: EntityManager,
  scope: CenterScope,
  month: string,
): Promise<number> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .select('SUM(operation.valueInCents)', 'total')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  const raw = await qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .andWhere('SUBSTR(operation.date, 0, 8) < :month', { month })
    .getRawOne<{ total: number | null }>()
  return raw?.total ?? 0
}

/** Operações de caixa do mês informado, no escopo informado. */
export async function listCashOperationsOfMonth(
  manager: EntityManager,
  scope: CenterScope,
  month: string,
): Promise<Operation[]> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .leftJoinAndSelect('operation.category', 'category')
    .leftJoinAndSelect('operation.recurringRule', 'recurringRule')
    .leftJoinAndSelect('operation.cardInvoice', 'cardInvoice')
    .leftJoinAndSelect('cardInvoice.creditCard', 'creditCard')
    .leftJoinAndSelect('operation.center', 'center')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  return qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .andWhere("STRFTIME('%m', operation.date) = :monthIndex", { monthIndex: month.slice(5, 7) })
    .andWhere("STRFTIME('%Y', operation.date) = :year", { year: month.slice(0, 4) })
    .orderBy('operation.date', 'DESC')
    .getMany()
}

/** Soma dos valores de caixa agendados do mês informado, após `cutoffDate`. */
export async function sumScheduledCashOfMonthAfter(
  manager: EntityManager,
  scope: CenterScope,
  month: string,
  cutoffDate: string,
): Promise<number> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .select('SUM(operation.valueInCents)', 'total')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  const raw = await qb
    .andWhere(EXCLUDE_CARD_PURCHASES)
    .andWhere("STRFTIME('%m', operation.date) = :monthIndex", { monthIndex: month.slice(5, 7) })
    .andWhere("STRFTIME('%Y', operation.date) = :year", { year: month.slice(0, 4) })
    .andWhere('operation.date > :cutoffDate', { cutoffDate })
    .getRawOne<{ total: number | null }>()
  return raw?.total ?? 0
}

/** Soma das compras de fatura do mês de referência informado, no escopo informado. */
export async function sumInvoicePurchasesOfReferenceMonth(
  manager: EntityManager,
  scope: CenterScope,
  month: string,
): Promise<number> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .innerJoin('operation.cardInvoice', 'invoice')
    .select('SUM(operation.valueInCents)', 'total')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  const raw = await qb
    .andWhere('invoice.mes_referencia = :month', { month })
    .andWhere('invoice.is_active = 1')
    .andWhere('operation.is_invoice_payment = 0')
    .getRawOne<{ total: number | null }>()
  return raw?.total ?? 0
}

/** Soma de operações de caixa por categoria, de um tipo (Entrada/Saída), no escopo informado. */
export async function sumOperationsByCategory(
  manager: EntityManager,
  scope: CenterScope,
  type: 'Entrada' | 'Saída',
  month?: string,
): Promise<Array<{ category: string; valueInCents: number }>> {
  const qb = manager
    .createQueryBuilder(Category, 'category')
    .leftJoinAndSelect('category.operations', 'operation')
    .select('category.name', 'category')
    .addSelect('SUM(operation.valueInCents)', 'valueInCents')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  qb.andWhere('operation.is_invoice_payment = 0').andWhere('category.type = :type', { type })

  if (month) {
    const year = month.slice(0, 4)
    const monthIndex = month.slice(5, 7)
    qb.andWhere("STRFTIME('%Y', operation.date) = :year", { year }).andWhere(
      "STRFTIME('%m', operation.date) = :monthIndex",
      { monthIndex },
    )
  }

  qb.groupBy('category.name').orderBy('SUM(operation.valueInCents)', type === 'Entrada' ? 'DESC' : 'ASC')

  return qb.getRawMany<{ category: string; valueInCents: number }>()
}

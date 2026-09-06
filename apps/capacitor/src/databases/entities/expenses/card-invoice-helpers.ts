import dayjs from 'dayjs'
import type { EntityManager } from 'typeorm'

import { applyCenterScope, type CenterScope } from '../../../models/center-scope'

import { CardInvoice, InvoiceStatus } from './card-invoice'
import { CreditCard } from './credit-card'
import { Operation } from './operation'

function clampDayInMonth(yearMonth: string, day: number): string {
  const monthStart = dayjs(`${yearMonth}-01`)
  const lastDay = monthStart.daysInMonth()
  const clampedDay = Math.min(day, lastDay)
  return monthStart.date(clampedDay).format('YYYY-MM-DD')
}

/** Mês de referência (YYYY-MM) em que a fatura fecha para a data da compra. */
export function resolveReferenceMonth(purchaseDate: string, closingDay: number): string {
  const date = dayjs(purchaseDate)
  const purchaseDay = date.date()
  if (purchaseDay <= closingDay) {
    return date.format('YYYY-MM')
  }
  return date.add(1, 'month').format('YYYY-MM')
}

export function resolveInvoiceDates(
  referenceMonth: string,
  closingDay: number,
  dueDay: number,
): { closingDate: string; dueDate: string } {
  const closingDate = clampDayInMonth(referenceMonth, closingDay)
  const dueMonth =
    dueDay > closingDay
      ? referenceMonth
      : dayjs(`${referenceMonth}-01`).add(1, 'month').format('YYYY-MM')
  const dueDate = clampDayInMonth(dueMonth, dueDay)
  return { closingDate, dueDate }
}

function nextReferenceMonth(referenceMonth: string): string {
  return dayjs(`${referenceMonth}-01`).add(1, 'month').format('YYYY-MM')
}

async function findInvoice(
  manager: EntityManager,
  cardId: number,
  referenceMonth: string,
): Promise<CardInvoice | null> {
  return manager.findOne(CardInvoice, {
    where: {
      creditCard: { id: cardId },
      referenceMonth,
      isActive: true,
    },
    relations: ['creditCard'],
  })
}

async function createInvoice(
  manager: EntityManager,
  card: CreditCard,
  referenceMonth: string,
): Promise<CardInvoice> {
  const { closingDate, dueDate } = resolveInvoiceDates(
    referenceMonth,
    card.closingDay,
    card.dueDay,
  )
  const invoice = manager.create(CardInvoice, {
    creditCard: card,
    referenceMonth,
    closingDate,
    dueDate,
    status: InvoiceStatus.ABERTA,
    isActive: true,
  })
  return manager.save(invoice)
}

/**
 * Garante a fatura do ciclo atual do cartão (modelo bancário).
 * Idempotente: só cria se ainda não existir fatura ativa para o mês.
 */
export async function ensureOpenInvoiceForCurrentCycle(
  manager: EntityManager,
  card: CreditCard,
): Promise<CardInvoice> {
  const today = dayjs().format('YYYY-MM-DD')
  const referenceMonth = resolveReferenceMonth(today, card.closingDay)
  const existing = await findInvoice(manager, card.id, referenceMonth)
  if (existing) {
    return existing
  }
  return createInvoice(manager, card, referenceMonth)
}

/**
 * Após fechar uma fatura antecipadamente, garante a próxima aberta.
 * Cria o mês seguinte ao fechado (se ainda não existir) e reforça o ciclo atual.
 */
export async function ensureSuccessorOpenInvoice(
  manager: EntityManager,
  card: CreditCard,
  closedReferenceMonth: string,
): Promise<void> {
  const nextMonth = nextReferenceMonth(closedReferenceMonth)
  const existingNext = await findInvoice(manager, card.id, nextMonth)
  if (!existingNext) {
    await createInvoice(manager, card, nextMonth)
  }
  await ensureOpenInvoiceForCurrentCycle(manager, card)
}

/**
 * Fecha faturas cujo fechamento já passou (`aberta` → `fechada`) e garante
 * a fatura aberta do ciclo atual por cartão ativo. Idempotente; não altera
 * faturas `paga`. Base para a regra de compra retroativa e para a trava de edição.
 */
export async function reconcileInvoiceStatuses(manager: EntityManager): Promise<void> {
  const today = dayjs().format('YYYY-MM-DD')
  await manager
    .createQueryBuilder()
    .update(CardInvoice)
    .set({ status: InvoiceStatus.FECHADA })
    .where('status = :status', { status: InvoiceStatus.ABERTA })
    .andWhere('is_active = 1')
    .andWhere('data_fechamento < :today', { today })
    .execute()

  const activeCards = await manager.find(CreditCard, { where: { isActive: true } })
  for (const card of activeCards) {
    await ensureOpenInvoiceForCurrentCycle(manager, card)
  }
}

/**
 * Resolve (ou cria lazy) a fatura aberta para uma compra na data informada.
 * Se a fatura do período estiver fechada/paga, avança para a próxima aberta.
 */
export async function getOrCreateInvoiceForPurchase(
  card: CreditCard,
  purchaseDate: string,
  manager: EntityManager,
): Promise<CardInvoice> {
  let referenceMonth = resolveReferenceMonth(purchaseDate, card.closingDay)

  // Limite de segurança para evitar loop infinito em dados inconsistentes
  for (let attempt = 0; attempt < 36; attempt++) {
    const existing = await findInvoice(manager, card.id, referenceMonth)

    if (!existing) {
      return createInvoice(manager, card, referenceMonth)
    }

    if (existing.status === InvoiceStatus.ABERTA) {
      return existing
    }

    // Fatura fechada/paga → próxima fatura aberta
    referenceMonth = nextReferenceMonth(referenceMonth)
  }

  throw new Error('Não foi possível resolver uma fatura aberta para a compra')
}

/** Linha derivada de fatura não paga (aberta/fechada) com saldo não-zero para um centro. */
export type UnpaidInvoiceCenterLine = {
  invoiceId: number
  cardId: number
  cardName: string
  dueDate: string
  valueInCents: number
}

/**
 * Para cada fatura ativa `aberta`/`fechada` com compras do escopo informado,
 * retorna a soma das operações ativas não-pagamento dessa fatura nesse
 * escopo. Faturas cujo total no escopo é zero não aparecem (a fatura pode
 * ter compras de outros centros que se cancelam entre si).
 */
export async function getUnpaidInvoiceCenterLines(
  manager: EntityManager,
  scope: CenterScope,
): Promise<UnpaidInvoiceCenterLine[]> {
  const qb = manager
    .createQueryBuilder(Operation, 'operation')
    .innerJoin('operation.cardInvoice', 'invoice')
    .innerJoin('invoice.creditCard', 'creditCard')
    .select('invoice.id', 'invoiceId')
    .addSelect('creditCard.id', 'cardId')
    .addSelect('creditCard.name', 'cardName')
    .addSelect('invoice.dueDate', 'dueDate')
    .addSelect('SUM(operation.valueInCents)', 'valueInCents')
    .where('operation.is_active = 1')
  applyCenterScope(qb, scope)
  const rows = await qb
    .andWhere('operation.is_invoice_payment = 0')
    .andWhere('invoice.is_active = 1')
    .andWhere('invoice.status IN (:...statuses)', {
      statuses: [InvoiceStatus.ABERTA, InvoiceStatus.FECHADA],
    })
    .groupBy('invoice.id')
    .having('SUM(operation.valueInCents) != 0')
    .orderBy('invoice.id')
    .getRawMany<{
      invoiceId: number
      cardId: number
      cardName: string
      dueDate: string
      valueInCents: number
    }>()

  return rows.map((row) => ({
    invoiceId: Number(row.invoiceId),
    cardId: Number(row.cardId),
    cardName: row.cardName,
    dueDate: row.dueDate,
    valueInCents: Number(row.valueInCents),
  }))
}

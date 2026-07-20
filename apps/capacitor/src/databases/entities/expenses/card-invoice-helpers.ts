import dayjs from 'dayjs'
import type { EntityManager } from 'typeorm'

import { CardInvoice, InvoiceStatus } from './card-invoice'
import type { CreditCard } from './credit-card'

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

/**
 * Fecha faturas cujo fechamento já passou (`aberta` → `fechada`).
 * Idempotente; não altera faturas `paga`. Base para a regra de compra
 * retroativa e para a trava de edição.
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

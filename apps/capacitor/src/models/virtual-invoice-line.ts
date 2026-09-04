import type { Operation } from '../databases/entities/expenses'
import type { UnpaidInvoiceCenterLine } from '../databases/entities/expenses/card-invoice-helpers'

/** Linha derivada de fatura não paga, exibida no meio das movimentações reais. Nunca persistida. */
export type VirtualInvoiceLine = {
  kind: 'virtual-invoice'
  id: string // `invoice-${invoiceId}`, chave estável para v-for
  invoiceId: number
  cardId: number
  cardName: string
  date: string // = dueDate
  valueInCents: number
}

export function isVirtualInvoiceLine(
  item: Operation | VirtualInvoiceLine,
): item is VirtualInvoiceLine {
  return (item as VirtualInvoiceLine).kind === 'virtual-invoice'
}

export function toVirtualInvoiceLine(line: UnpaidInvoiceCenterLine): VirtualInvoiceLine {
  return {
    kind: 'virtual-invoice',
    id: `invoice-${line.invoiceId}`,
    invoiceId: line.invoiceId,
    cardId: line.cardId,
    cardName: line.cardName,
    date: line.dueDate,
    valueInCents: line.valueInCents,
  }
}

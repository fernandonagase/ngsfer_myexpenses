import { afterEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'

import { createInMemoryExpensesDataSource } from '../../expenses-test-datasource'
import { ALL_SCOPE, NONE_SCOPE, type CenterScope } from '../../../models/center-scope'

import { Category } from './category'
import { Center } from './center'
import { CreditCard } from './credit-card'
import { CardInvoice, InvoiceStatus } from './card-invoice'
import { Operation } from './operation'
import { getUnpaidInvoiceCenterLines } from './card-invoice-helpers'

let dataSource: DataSource | null = null

afterEach(async () => {
  if (dataSource) {
    await dataSource.destroy()
    dataSource = null
  }
})

function centerScope(centerId: number): CenterScope {
  return { kind: 'center', centerId }
}

async function setup() {
  dataSource = await createInMemoryExpensesDataSource()
  const manager = dataSource.manager
  const category = await manager.save(Category, { name: 'Compra Teste', type: 'Saída' })
  const center = await manager.save(Center, { name: 'Casa', isActive: true })
  const card = await manager.save(CreditCard, {
    name: 'Cartão Teste',
    closingDay: 10,
    dueDay: 20,
    isActive: true,
  })
  return { manager, category, center, card }
}

describe('getUnpaidInvoiceCenterLines', () => {
  it('all = centro + Sem centro para uma fatura com compras nos dois', async () => {
    const { manager, category, center, card } = await setup()
    const invoice = await manager.save(CardInvoice, {
      creditCard: card,
      referenceMonth: '2026-05',
      closingDate: '2026-05-10',
      dueDate: '2026-05-20',
      status: InvoiceStatus.FECHADA,
      isActive: true,
    })
    await manager.save(Operation, [
      {
        category,
        center,
        date: '2026-05-05',
        valueInCents: -1000,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
      {
        category,
        center: null,
        date: '2026-05-06',
        valueInCents: -2000,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
    ])

    const all = await getUnpaidInvoiceCenterLines(manager, ALL_SCOPE)
    const centerOnly = await getUnpaidInvoiceCenterLines(manager, centerScope(center.id))
    const none = await getUnpaidInvoiceCenterLines(manager, NONE_SCOPE)

    expect(centerOnly).toEqual([
      expect.objectContaining({ invoiceId: invoice.id, valueInCents: -1000 }),
    ])
    expect(none).toEqual([expect.objectContaining({ invoiceId: invoice.id, valueInCents: -2000 })])
    expect(all).toEqual([expect.objectContaining({ invoiceId: invoice.id, valueInCents: -3000 })])
    expect(all[0]!.valueInCents).toBe(centerOnly[0]!.valueInCents + none[0]!.valueInCents)
  })

  it('fatura cujas compras entre centro e Sem centro se cancelam (soma zero) não aparece em all', async () => {
    const { manager, category, center, card } = await setup()
    const invoice = await manager.save(CardInvoice, {
      creditCard: card,
      referenceMonth: '2026-06',
      closingDate: '2026-06-10',
      dueDate: '2026-06-20',
      status: InvoiceStatus.FECHADA,
      isActive: true,
    })
    await manager.save(Operation, [
      {
        category,
        center,
        date: '2026-06-05',
        valueInCents: -1000,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
      {
        category,
        center: null,
        date: '2026-06-06',
        valueInCents: 1000,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
    ])

    const all = await getUnpaidInvoiceCenterLines(manager, ALL_SCOPE)

    expect(all).toEqual([])
  })
})

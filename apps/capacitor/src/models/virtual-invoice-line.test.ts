import { describe, expect, it } from 'vitest'

import type { Operation } from '../databases/entities/expenses'
import type { UnpaidInvoiceCenterLine } from '../databases/entities/expenses/card-invoice-helpers'

import { isVirtualInvoiceLine, toVirtualInvoiceLine, type VirtualInvoiceLine } from './virtual-invoice-line'

describe('isVirtualInvoiceLine', () => {
  it('retorna true para um VirtualInvoiceLine', () => {
    const line: VirtualInvoiceLine = {
      kind: 'virtual-invoice',
      id: 'invoice-1',
      invoiceId: 1,
      cardId: 2,
      cardName: 'Cartão X',
      date: '2026-09-10',
      valueInCents: -1000,
    }
    expect(isVirtualInvoiceLine(line)).toBe(true)
  })

  it('retorna false para uma Operation (sem campo kind)', () => {
    const operation = { id: 1, valueInCents: -500, date: '2026-09-01' } as Operation
    expect(isVirtualInvoiceLine(operation)).toBe(false)
  })
})

describe('toVirtualInvoiceLine', () => {
  const line: UnpaidInvoiceCenterLine = {
    invoiceId: 42,
    cardId: 7,
    cardName: 'Cartão Nubank',
    dueDate: '2026-09-15',
    valueInCents: -12345,
  }

  it('mapeia dueDate para date', () => {
    expect(toVirtualInvoiceLine(line).date).toBe('2026-09-15')
  })

  it('preserva valueInCents, cardName, cardId e invoiceId', () => {
    const result = toVirtualInvoiceLine(line)
    expect(result.valueInCents).toBe(-12345)
    expect(result.cardName).toBe('Cartão Nubank')
    expect(result.cardId).toBe(7)
    expect(result.invoiceId).toBe(42)
  })

  it('gera id no formato invoice-<id>', () => {
    expect(toVirtualInvoiceLine(line).id).toBe('invoice-42')
  })

  it('define kind como virtual-invoice', () => {
    expect(toVirtualInvoiceLine(line).kind).toBe('virtual-invoice')
  })

  it('produz id estável e único por invoiceId (mesma entrada → mesmo id, entradas diferentes → ids diferentes)', () => {
    const other: UnpaidInvoiceCenterLine = { ...line, invoiceId: 43 }
    expect(toVirtualInvoiceLine(line).id).toBe(toVirtualInvoiceLine({ ...line }).id)
    expect(toVirtualInvoiceLine(line).id).not.toBe(toVirtualInvoiceLine(other).id)
  })
})

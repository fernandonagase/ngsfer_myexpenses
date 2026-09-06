import { afterEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'

import { createInMemoryExpensesDataSource } from '../../expenses-test-datasource'
import { ALL_SCOPE, NONE_SCOPE, type CenterScope } from '../../../models/center-scope'

import { Category } from './category'
import { Center } from './center'
import { CreditCard } from './credit-card'
import { CardInvoice, InvoiceStatus } from './card-invoice'
import { Operation } from './operation'
import {
  listCashMonths,
  listCashOperationsOfMonth,
  listInvoiceReferenceMonths,
  listScheduledCashValues,
  sumCashBalanceBeforeMonth,
  sumCashBalanceUntil,
  sumInvoicePurchasesOfReferenceMonth,
  sumOperationsByCategory,
  sumScheduledCashOfMonthAfter,
} from './operation-queries'

let dataSource: DataSource | null = null

afterEach(async () => {
  if (dataSource) {
    await dataSource.destroy()
    dataSource = null
  }
})

async function setup() {
  dataSource = await createInMemoryExpensesDataSource()
  const manager = dataSource.manager
  const category = await manager.save(Category, { name: 'Despesa Teste', type: 'Saída' })
  const center = await manager.save(Center, { name: 'Casa', isActive: true })
  return { manager, category, center }
}

function centerScope(centerId: number): CenterScope {
  return { kind: 'center', centerId }
}

describe('sumCashBalanceUntil', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-05', valueInCents: -1000 },
      { category, center, date: '2026-05-25', valueInCents: -2000 },
      { category, center: null, date: '2026-05-05', valueInCents: -3000 },
      { category, center: null, date: '2026-05-25', valueInCents: -4000 },
    ])

    const all = await sumCashBalanceUntil(manager, ALL_SCOPE, '2026-05-15')
    const centerOnly = await sumCashBalanceUntil(manager, centerScope(center.id), '2026-05-15')
    const none = await sumCashBalanceUntil(manager, NONE_SCOPE, '2026-05-15')

    expect(centerOnly).toBe(-1000)
    expect(none).toBe(-3000)
    expect(all).toBe(-4000)
    expect(all).toBe(centerOnly + none)
  })
})

describe('listScheduledCashValues', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-05', valueInCents: -1000 },
      { category, center, date: '2026-05-25', valueInCents: -2000 },
      { category, center: null, date: '2026-05-05', valueInCents: -3000 },
      { category, center: null, date: '2026-05-25', valueInCents: -4000 },
    ])
    const sum = (rows: Array<{ valueInCents: number }>) =>
      rows.reduce((acc, row) => acc + row.valueInCents, 0)

    const all = await listScheduledCashValues(manager, ALL_SCOPE, '2026-05-15', '2026-05-31')
    const centerOnly = await listScheduledCashValues(
      manager,
      centerScope(center.id),
      '2026-05-15',
      '2026-05-31',
    )
    const none = await listScheduledCashValues(manager, NONE_SCOPE, '2026-05-15', '2026-05-31')

    expect(sum(centerOnly)).toBe(-2000)
    expect(sum(none)).toBe(-4000)
    expect(sum(all)).toBe(-6000)
    expect(sum(all)).toBe(sum(centerOnly) + sum(none))
  })
})

describe('listCashMonths', () => {
  it('cada escopo lista só os meses das suas próprias operações', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-05', valueInCents: -1000 },
      { category, center, date: '2026-06-05', valueInCents: -1500 },
      { category, center: null, date: '2026-05-10', valueInCents: -3000 },
    ])

    const all = await listCashMonths(manager, ALL_SCOPE)
    const centerOnly = await listCashMonths(manager, centerScope(center.id))
    const none = await listCashMonths(manager, NONE_SCOPE)

    expect(centerOnly).toEqual([
      { month: '05', year: '2026' },
      { month: '06', year: '2026' },
    ])
    expect(none).toEqual([{ month: '05', year: '2026' }])
    expect(all).toEqual([
      { month: '05', year: '2026' },
      { month: '06', year: '2026' },
    ])
  })
})

describe('listInvoiceReferenceMonths', () => {
  it('cada escopo lista só os meses de referência das compras do seu escopo', async () => {
    const { manager, category, center } = await setup()
    const card = await manager.save(CreditCard, {
      name: 'Cartão Teste',
      closingDay: 10,
      dueDay: 20,
      isActive: true,
    })
    const invoiceMay = await manager.save(CardInvoice, {
      creditCard: card,
      referenceMonth: '2026-05',
      closingDate: '2026-05-10',
      dueDate: '2026-05-20',
      status: InvoiceStatus.FECHADA,
      isActive: true,
    })
    const invoiceJune = await manager.save(CardInvoice, {
      creditCard: card,
      referenceMonth: '2026-06',
      closingDate: '2026-06-10',
      dueDate: '2026-06-20',
      status: InvoiceStatus.ABERTA,
      isActive: true,
    })
    await manager.save(Operation, [
      {
        category,
        center,
        date: '2026-05-08',
        valueInCents: -500,
        cardInvoice: invoiceMay,
        isInvoicePayment: false,
      },
      {
        category,
        center: null,
        date: '2026-06-08',
        valueInCents: -700,
        cardInvoice: invoiceJune,
        isInvoicePayment: false,
      },
    ])

    const all = await listInvoiceReferenceMonths(manager, ALL_SCOPE)
    const centerOnly = await listInvoiceReferenceMonths(manager, centerScope(center.id))
    const none = await listInvoiceReferenceMonths(manager, NONE_SCOPE)

    expect(centerOnly).toEqual(['2026-05'])
    expect(none).toEqual(['2026-06'])
    expect(all.sort()).toEqual(['2026-05', '2026-06'])
  })
})

describe('sumCashBalanceBeforeMonth', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-04-15', valueInCents: -50 },
      { category, center: null, date: '2026-04-20', valueInCents: -70 },
      { category, center, date: '2026-05-05', valueInCents: -999999 }, // não conta: não é "antes" do mês
    ])

    const all = await sumCashBalanceBeforeMonth(manager, ALL_SCOPE, '2026-05')
    const centerOnly = await sumCashBalanceBeforeMonth(manager, centerScope(center.id), '2026-05')
    const none = await sumCashBalanceBeforeMonth(manager, NONE_SCOPE, '2026-05')

    expect(centerOnly).toBe(-50)
    expect(none).toBe(-70)
    expect(all).toBe(-120)
    expect(all).toBe(centerOnly + none)
  })
})

describe('listCashOperationsOfMonth', () => {
  it('all = centro + Sem centro (contagem e soma) e carrega a relação center', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-05', valueInCents: -1000 },
      { category, center: null, date: '2026-05-10', valueInCents: -3000 },
    ])

    const all = await listCashOperationsOfMonth(manager, ALL_SCOPE, '2026-05')
    const centerOnly = await listCashOperationsOfMonth(manager, centerScope(center.id), '2026-05')
    const none = await listCashOperationsOfMonth(manager, NONE_SCOPE, '2026-05')

    expect(centerOnly).toHaveLength(1)
    expect(none).toHaveLength(1)
    expect(all).toHaveLength(2)
    expect(all.length).toBe(centerOnly.length + none.length)

    const sum = (rows: Operation[]) => rows.reduce((acc, op) => acc + op.valueInCents, 0)
    expect(sum(all)).toBe(sum(centerOnly) + sum(none))

    const withCenter = all.find((op) => op.valueInCents === -1000)
    const withoutCenter = all.find((op) => op.valueInCents === -3000)
    expect(withCenter?.center?.id).toBe(center.id)
    expect(withoutCenter?.center ?? null).toBeNull()
  })
})

describe('sumScheduledCashOfMonthAfter', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-10', valueInCents: -1000 }, // antes do corte, não conta
      { category, center, date: '2026-05-25', valueInCents: -2000 },
      { category, center: null, date: '2026-05-25', valueInCents: -4000 },
    ])

    const all = await sumScheduledCashOfMonthAfter(manager, ALL_SCOPE, '2026-05', '2026-05-15')
    const centerOnly = await sumScheduledCashOfMonthAfter(
      manager,
      centerScope(center.id),
      '2026-05',
      '2026-05-15',
    )
    const none = await sumScheduledCashOfMonthAfter(manager, NONE_SCOPE, '2026-05', '2026-05-15')

    expect(centerOnly).toBe(-2000)
    expect(none).toBe(-4000)
    expect(all).toBe(-6000)
    expect(all).toBe(centerOnly + none)
  })
})

describe('sumInvoicePurchasesOfReferenceMonth', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    const card = await manager.save(CreditCard, {
      name: 'Cartão Teste',
      closingDay: 10,
      dueDay: 20,
      isActive: true,
    })
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
        date: '2026-05-08',
        valueInCents: -500,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
      {
        category,
        center: null,
        date: '2026-05-09',
        valueInCents: -700,
        cardInvoice: invoice,
        isInvoicePayment: false,
      },
    ])

    const all = await sumInvoicePurchasesOfReferenceMonth(manager, ALL_SCOPE, '2026-05')
    const centerOnly = await sumInvoicePurchasesOfReferenceMonth(
      manager,
      centerScope(center.id),
      '2026-05',
    )
    const none = await sumInvoicePurchasesOfReferenceMonth(manager, NONE_SCOPE, '2026-05')

    expect(centerOnly).toBe(-500)
    expect(none).toBe(-700)
    expect(all).toBe(-1200)
    expect(all).toBe(centerOnly + none)
  })
})

describe('sumOperationsByCategory', () => {
  it('all = centro + Sem centro', async () => {
    const { manager, category, center } = await setup()
    await manager.save(Operation, [
      { category, center, date: '2026-05-05', valueInCents: -1000 },
      { category, center: null, date: '2026-05-10', valueInCents: -3000 },
    ])
    const sum = (rows: Array<{ valueInCents: number }>) =>
      rows.reduce((acc, row) => acc + Number(row.valueInCents), 0)

    const all = await sumOperationsByCategory(manager, ALL_SCOPE, 'Saída')
    const centerOnly = await sumOperationsByCategory(manager, centerScope(center.id), 'Saída')
    const none = await sumOperationsByCategory(manager, NONE_SCOPE, 'Saída')

    expect(sum(centerOnly)).toBe(-1000)
    expect(sum(none)).toBe(-3000)
    expect(sum(all)).toBe(-4000)
    expect(sum(all)).toBe(sum(centerOnly) + sum(none))
  })
})

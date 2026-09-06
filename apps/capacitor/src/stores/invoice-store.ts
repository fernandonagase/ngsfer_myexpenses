import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'

import type { CreditCard } from 'src/databases/entities/expenses'
import {
  Category,
  CardInvoice,
  Operation,
} from 'src/databases/entities/expenses'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'
import {
  ensureSuccessorOpenInvoice,
  reconcileInvoiceStatuses,
} from 'src/databases/entities/expenses/card-invoice-helpers'
import { INVOICE_PAYMENT_CATEGORY_NAME } from 'src/databases/entities/expenses/invoice-constants'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { useOperationStore } from 'src/stores/operation-store'

const invoiceRepository = expensesDataSource.dataSource.getRepository(CardInvoice)
const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

/** Participação de um centro no total da fatura (valor em centavos, negativo = saída). */
export type InvoiceCenterShare = {
  centerId: number | null
  centerName: string | null
  valueInCents: number
}

export const useInvoiceStore = defineStore('invoice', () => {
  const $q = useQuasar()
  const operationStore = useOperationStore()

  const invoices = ref<Array<CardInvoice>>([])

  async function fetchInvoicesByCard(cardId: number) {
    await reconcileInvoiceStatuses(expensesDataSource.dataSource.manager)
    invoices.value = await invoiceRepository.find({
      where: { creditCard: { id: cardId }, isActive: true },
      relations: ['creditCard'],
      order: { referenceMonth: 'DESC' },
    })
  }

  async function getInvoiceTotal(invoiceId: number): Promise<number> {
    const raw = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'total')
      .where('operation.fatura_cartao_id = :invoiceId', { invoiceId })
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .getRawOne<{ total: number | null }>()
    return raw?.total ?? 0
  }

  /** Totais (centavos) por fatura do cartão — uma query agregada para classificar a lista. */
  async function getInvoiceTotalsByCard(cardId: number): Promise<Record<number, number>> {
    const rows = await operationRepository
      .createQueryBuilder('operation')
      .innerJoin('operation.cardInvoice', 'invoice')
      .select('invoice.id', 'invoiceId')
      .addSelect('SUM(operation.valueInCents)', 'total')
      .where('invoice.cartao_credito_id = :cardId', { cardId })
      .andWhere('invoice.is_active = 1')
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .groupBy('invoice.id')
      .getRawMany<{ invoiceId: number; total: number | null }>()

    const totals: Record<number, number> = {}
    for (const row of rows) {
      totals[Number(row.invoiceId)] = Number(row.total ?? 0)
    }
    return totals
  }

  async function getInvoiceBreakdownByCenter(invoiceId: number): Promise<InvoiceCenterShare[]> {
    const rows = await operationRepository
      .createQueryBuilder('operation')
      .leftJoin('operation.center', 'center')
      .select('center.id', 'centerId')
      .addSelect('center.name', 'centerName')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.fatura_cartao_id = :invoiceId', { invoiceId })
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .groupBy('center.id')
      .addGroupBy('center.name')
      .orderBy('center.id')
      .getRawMany<{ centerId: number | null; centerName: string | null; valueInCents: number }>()

    return rows.map((row) => ({
      centerId: row.centerId == null ? null : Number(row.centerId),
      centerName: row.centerName,
      valueInCents: Number(row.valueInCents),
    }))
  }

  async function getInvoiceOperations(invoiceId: number): Promise<Operation[]> {
    return operationRepository.find({
      where: { cardInvoice: { id: invoiceId }, isInvoicePayment: false, isActive: true },
      relations: ['category', 'center', 'cardInvoice', 'cardInvoice.creditCard'],
      order: { date: 'DESC' },
    })
  }

  async function getPaymentCategory(): Promise<Category> {
    const category = await expensesDataSource.dataSource
      .getRepository(Category)
      .findOne({ where: { name: INVOICE_PAYMENT_CATEGORY_NAME, isSystem: true } })
    if (!category) {
      throw new Error('Categoria de sistema "Pagamento de fatura" não encontrada')
    }
    return category
  }

  /**
   * Gera 1 operação de pagamento por centro (is_invoice_payment = true) e marca a
   * fatura como paga. Só permite pagar faturas fechadas (decisão de negócio).
   * A soma das participações equivale ao total da fatura (o que saiu do banco).
   */
  async function payInvoice(
    invoice: CardInvoice,
    options: { paymentDate: string; shares: InvoiceCenterShare[] },
  ): Promise<boolean> {
    if (invoice.status !== InvoiceStatus.FECHADA) {
      $q.notify({
        type: 'warning',
        message: 'Só é possível pagar faturas fechadas.',
      })
      return false
    }
    if (options.shares.length === 0) {
      $q.notify({ type: 'warning', message: 'Esta fatura não possui compras para pagar.' })
      return false
    }

    try {
      const paymentCategory = await getPaymentCategory()
      const cardName = invoice.creditCard?.name ?? 'cartão'
      const rawDescription = `Pagamento fatura ${cardName} ${invoice.referenceMonth}`
      const description = rawDescription.slice(0, 50)

      await expensesDataSource.dataSource.manager.transaction(async (manager) => {
        const payments = options.shares.map((share) =>
          manager.create(Operation, {
            valueInCents: share.valueInCents,
            date: options.paymentDate,
            category: paymentCategory,
            description,
            center: share.centerId == null ? null : { id: share.centerId },
            cardInvoice: invoice,
            isInvoicePayment: true,
            notificationEnabled: false,
          }),
        )
        await manager.save(Operation, payments)
        await manager
          .createQueryBuilder()
          .update(CardInvoice)
          .set({ status: InvoiceStatus.PAGA, paymentDate: options.paymentDate })
          .where('id = :id', { id: invoice.id })
          .execute()
      })

      invoice.status = InvoiceStatus.PAGA
      invoice.paymentDate = options.paymentDate
      await operationStore.refreshScreen()
      $q.notify({ type: 'positive', message: 'Fatura paga com sucesso!' })
      return true
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Falha ao pagar fatura',
        caption: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  /**
   * Estorna o pagamento (hard delete das operações de pagamento) e volta a fatura
   * para fechada (ou aberta, se o fechamento ainda não passou).
   */
  function reopenInvoicePayment(invoice: CardInvoice) {
    $q.dialog({
      title: 'Estornar pagamento?',
      message:
        'As transferências de pagamento serão excluídas e a fatura voltará a ficar em aberto para pagamento.',
      ok: { label: 'Confirmar' },
      cancel: { label: 'Cancelar', color: 'negative', flat: true },
    }).onOk(() => {
      void doReopenInvoicePayment(invoice)
    })
  }

  async function doReopenInvoicePayment(invoice: CardInvoice) {
    try {
      const today = dayjs().format('YYYY-MM-DD')
      const nextStatus =
        invoice.closingDate < today ? InvoiceStatus.FECHADA : InvoiceStatus.ABERTA

      await expensesDataSource.dataSource.manager.transaction(async (manager) => {
        const payments = await manager.find(Operation, {
          where: { cardInvoice: { id: invoice.id }, isInvoicePayment: true },
        })
        if (payments.length > 0) {
          await manager.remove(Operation, payments)
        }
        await manager
          .createQueryBuilder()
          .update(CardInvoice)
          .set({ status: nextStatus, paymentDate: null })
          .where('id = :id', { id: invoice.id })
          .execute()
      })

      invoice.status = nextStatus
      invoice.paymentDate = null
      await operationStore.refreshScreen()
      $q.notify({ type: 'positive', message: 'Pagamento estornado com sucesso!' })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: 'Falha ao estornar pagamento',
        caption: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Reabre uma fatura fechada para edição das compras (fechada → aberta).
   * Faturas pagas precisam ser estornadas antes.
   */
  function reopenInvoiceForEditing(invoice: CardInvoice) {
    if (invoice.status === InvoiceStatus.PAGA) {
      $q.notify({
        type: 'warning',
        message: 'Estorne o pagamento antes de reabrir a fatura para edição.',
      })
      return
    }
    if (invoice.status === InvoiceStatus.ABERTA) return

    $q.dialog({
      title: 'Reabrir fatura para edição?',
      message:
        'A fatura voltará a ficar aberta, permitindo editar as compras. Novas compras retroativas poderão cair nela.',
      ok: { label: 'Confirmar' },
      cancel: { label: 'Cancelar', color: 'negative', flat: true },
    }).onOk(() => {
      invoice.status = InvoiceStatus.ABERTA
      invoiceRepository
        .save(invoice)
        .then(() => {
          $q.notify({ type: 'positive', message: 'Fatura reaberta para edição.' })
        })
        .catch((error) => {
          invoice.status = InvoiceStatus.FECHADA
          $q.notify({
            type: 'negative',
            message: 'Falha ao reabrir fatura',
            caption: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }

  /**
   * Fecha antecipadamente uma fatura aberta (aberta → fechada), sem alterar
   * datas. Garante a próxima fatura aberta para novas compras.
   */
  function closeInvoiceEarly(invoice: CardInvoice) {
    if (invoice.status !== InvoiceStatus.ABERTA) {
      $q.notify({
        type: 'warning',
        message: 'Só é possível fechar faturas abertas.',
      })
      return
    }

    $q.dialog({
      title: 'Fechar fatura agora?',
      message:
        'Ela deixa de receber compras e fica disponível para pagamento. Novas compras vão para a próxima fatura. Você pode reabrir depois se precisar editar.',
      ok: { label: 'Fechar' },
      cancel: { label: 'Cancelar', color: 'negative', flat: true },
    }).onOk(() => {
      void doCloseInvoiceEarly(invoice)
    })
  }

  async function doCloseInvoiceEarly(invoice: CardInvoice) {
    invoice.status = InvoiceStatus.FECHADA
    try {
      await invoiceRepository.save(invoice)

      let card = invoice.creditCard
      if (!card?.id) {
        const withCard = await invoiceRepository.findOne({
          where: { id: invoice.id },
          relations: ['creditCard'],
        })
        card = withCard?.creditCard as CreditCard
      }
      if (!card) {
        throw new Error('Cartão da fatura não encontrado')
      }

      await ensureSuccessorOpenInvoice(
        expensesDataSource.dataSource.manager,
        card,
        invoice.referenceMonth,
      )
      await operationStore.refreshScreen()
      $q.notify({ type: 'positive', message: 'Fatura fechada com sucesso.' })
    } catch (error) {
      invoice.status = InvoiceStatus.ABERTA
      try {
        await invoiceRepository.save(invoice)
      } catch {
        // mantém status local; falha de rollback já foi notificada abaixo
      }
      $q.notify({
        type: 'negative',
        message: 'Falha ao fechar fatura',
        caption: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    invoices,
    fetchInvoicesByCard,
    getInvoiceTotal,
    getInvoiceTotalsByCard,
    getInvoiceBreakdownByCenter,
    getInvoiceOperations,
    payInvoice,
    reopenInvoicePayment,
    reopenInvoiceForEditing,
    closeInvoiceEarly,
  }
})

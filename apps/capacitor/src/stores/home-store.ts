import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'

import { Operation } from 'src/databases/entities/expenses'
import { getUnpaidInvoiceCenterLines } from 'src/databases/entities/expenses/card-invoice-helpers'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { useOperationStore } from 'src/stores/operation-store'

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

/**
 * Classifica um conjunto de itens com `valueInCents` em saídas (soma dos
 * negativos) e entradas (soma dos positivos) agendadas. Valor zero não conta
 * para nenhum dos dois lados.
 */
export function sumBySign(
  items: Array<{ valueInCents: number }>,
): { outflowsInCents: number; inflowsInCents: number } {
  let outflowsInCents = 0
  let inflowsInCents = 0
  for (const item of items) {
    if (item.valueInCents < 0) {
      outflowsInCents += item.valueInCents
    } else if (item.valueInCents > 0) {
      inflowsInCents += item.valueInCents
    }
  }
  return { outflowsInCents, inflowsInCents }
}

export type HomeSummary = {
  balanceInCents: number
  scheduledOutflowsInCents: number
  scheduledInflowsInCents: number
}

export const useHomeStore = defineStore('home', () => {
  const operationStore = useOperationStore()

  const summary = ref<HomeSummary | null>(null)
  const hasLoaded = ref(false)
  const error = ref<string | null>(null)

  // Compras no crédito não entram no saldo/lista de caixa (mesma exclusão de operation-store.ts)
  const excludeCardPurchases =
    'NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)'

  async function refresh(): Promise<void> {
    const center = operationStore.center
    if (!center) return

    try {
      const today = dayjs().format('YYYY-MM-DD')
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

      const balanceRaw = await operationRepository
        .createQueryBuilder('operation')
        .select('SUM(operation.valueInCents)', 'total')
        .where('operation.centro_financeiro_id = :centerId', { centerId: center.id })
        .andWhere('operation.is_active = 1')
        .andWhere(excludeCardPurchases)
        .andWhere('operation.date <= :today', { today })
        .getRawOne<{ total: number | null }>()
      const balanceInCents = balanceRaw?.total ?? 0

      const scheduledCashOperations = await operationRepository
        .createQueryBuilder('operation')
        .select('operation.valueInCents', 'valueInCents')
        .where('operation.centro_financeiro_id = :centerId', { centerId: center.id })
        .andWhere('operation.is_active = 1')
        .andWhere(excludeCardPurchases)
        .andWhere('operation.date > :today', { today })
        .andWhere('operation.date <= :endOfMonth', { endOfMonth })
        .getRawMany<{ valueInCents: number }>()

      const unpaidInvoiceLines = await getUnpaidInvoiceCenterLines(
        expensesDataSource.dataSource.manager,
        center.id,
      )

      const { outflowsInCents, inflowsInCents } = sumBySign([
        ...scheduledCashOperations,
        ...unpaidInvoiceLines,
      ])

      summary.value = {
        balanceInCents,
        scheduledOutflowsInCents: outflowsInCents,
        scheduledInflowsInCents: inflowsInCents,
      }
      error.value = null
    } catch (err) {
      console.error(err)
      error.value = 'Não foi possível carregar o resumo financeiro.'
    } finally {
      hasLoaded.value = true
    }
  }

  watch(() => operationStore.dataRevision, refresh)

  return {
    summary,
    hasLoaded,
    error,
    refresh,
  }
})

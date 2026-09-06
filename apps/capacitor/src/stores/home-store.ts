import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import dayjs from 'dayjs'

import { getUnpaidInvoiceCenterLines } from 'src/databases/entities/expenses/card-invoice-helpers'
import {
  sumCashBalanceUntil,
  listScheduledCashValues,
} from 'src/databases/entities/expenses/operation-queries'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { useOperationStore } from 'src/stores/operation-store'

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

  async function refresh(): Promise<void> {
    const scope = operationStore.scope
    const manager = expensesDataSource.dataSource.manager

    try {
      const today = dayjs().format('YYYY-MM-DD')
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD')

      const balanceInCents = await sumCashBalanceUntil(manager, scope, today)

      const scheduledCashOperations = await listScheduledCashValues(
        manager,
        scope,
        today,
        endOfMonth,
      )

      const unpaidInvoiceLines = await getUnpaidInvoiceCenterLines(manager, scope)

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

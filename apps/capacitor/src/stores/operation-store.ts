import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { BRL, splitInInstallments } from '@ngsfer-myexpenses/utils'

import {
  Operation,
  RecurringRule,
  type CardInvoice,
  type Category,
  type Center,
  type CreditCard,
} from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import OperationDialog from 'src/components/operation/OperationDialog.vue'
import { type RecurrenceType } from 'src/components/operation/recurrence-types'
import { type EntityManager } from 'typeorm'
import {
  type FrequencyType,
  RecurringRuleType,
} from 'src/databases/entities/expenses/recurring-rule'
import { notificationService } from 'src/services/notification-service'
import {
  getOrCreateInvoiceForPurchase,
  getUnpaidInvoiceCenterLines,
  reconcileInvoiceStatuses,
} from 'src/databases/entities/expenses/card-invoice-helpers'
import {
  sumCashBalanceBeforeMonth,
  sumCashBalanceUntil,
  sumScheduledCashOfMonthAfter,
  sumInvoicePurchasesOfReferenceMonth,
  sumOperationsByCategory,
  listCashMonths,
  listCashOperationsOfMonth,
  listInvoiceReferenceMonths,
} from 'src/databases/entities/expenses/operation-queries'
import {
  toVirtualInvoiceLine,
  type VirtualInvoiceLine,
} from 'src/models/virtual-invoice-line'
import {
  ALL_SCOPE,
  isSameScope,
  reconcileScope,
  defaultFormCenter,
  scopeLabel as computeScopeLabel,
  type CenterScope,
} from 'src/models/center-scope'
import { useCenterStore } from 'src/stores/center-store'

type OperationPayload = {
  value: number
  date: string
  category: Category
  description: string
  installmentCount?: number
  recurrenceType: RecurrenceType
  recurrenceFrequency?: FrequencyType
  notes?: string
  notificationEnabled?: boolean
  notificationDaysBefore?: number
  notificationTime?: string
  isCredit?: boolean
  creditCard?: CreditCard | null
  center: Center | null
}

type OperationData = {
  date: string
  category: Category
  center: Center | null
  description: string
  notes?: string | undefined
  notificationEnabled?: boolean
  notificationDaysBefore?: number
  notificationTime?: string
  creditCard?: CreditCard | null
}

type RecurringRuleData = {
  description: string
  valueInCents: number
  startDate: string
  nextRunDate: string
  category: Category
  center: Center | null
  recurrenceFrequency: FrequencyType
  anchorDay: number
}

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

function addRecurringRule(
  recurringRuleData: RecurringRuleData,
  { manager }: { manager: EntityManager },
) {
  const recurringRule = manager.create(RecurringRule, {
    description: recurringRuleData.description,
    valueInCents: recurringRuleData.valueInCents,
    ruleType:
      recurringRuleData.valueInCents > 0 ? RecurringRuleType.INCOME : RecurringRuleType.EXPENSE,
    startDate: recurringRuleData.startDate,
    nextRunDate: recurringRuleData.nextRunDate,
    category: recurringRuleData.category,
    center: recurringRuleData.center,
    frequency: recurringRuleData.recurrenceFrequency,
    anchorDay: recurringRuleData.anchorDay,
  })
  return manager.save(recurringRule)
}

async function addOperations(
  operationData: OperationData,
  {
    values,
    recurringRule,
    manager,
  }: { values: number[]; recurringRule?: RecurringRule; manager: EntityManager },
) {
  const today = dayjs().format('YYYY-MM-DD')
  const operations: Operation[] = []

  for (const [index, valueInCents] of values.entries()) {
    const operationDate = dayjs(operationData.date).add(index, 'month').format('YYYY-MM-DD')
    const isFuture = operationDate > today

    let cardInvoice: CardInvoice | null = null
    if (operationData.creditCard) {
      cardInvoice = await getOrCreateInvoiceForPurchase(
        operationData.creditCard,
        operationDate,
        manager,
      )
    }

    const operation = manager.create(Operation, {
      valueInCents: valueInCents,
      date: operationDate,
      category: operationData.category,
      description:
        values.length > 1
          ? `${operationData.description} (${index + 1}/${values.length})`
          : operationData.description,
      center: operationData.center,
      ...(operationData.notes !== undefined ? { notes: operationData.notes } : {}),
      notificationEnabled: isFuture ? (operationData.notificationEnabled ?? false) : false,
      ...(isFuture && operationData.notificationEnabled
        ? {
            notificationDaysBefore: operationData.notificationDaysBefore,
            notificationTime: operationData.notificationTime,
          }
        : {}),
      cardInvoice: cardInvoice,
      isInvoicePayment: false,
    })
    if (recurringRule) {
      operation.setRecurringRule(recurringRule)
    }
    operations.push(operation)
  }

  return manager.save(Operation, operations)
}

export const useOperationStore = defineStore('operation', () => {
  const $q = useQuasar()
  const router = useRouter()
  const centerStore = useCenterStore()
  const scope = ref<CenterScope>(ALL_SCOPE)
  const scopeLabel = computed(() => computeScopeLabel(scope.value, centerStore.activeCenters))
  const months = ref<Array<{ label: string; value: string }>>([])
  const month = ref<string>()
  const hasLoadedFirstTime = ref(false)
  const dataRevision = ref(0)

  function bumpDataRevision() {
    dataRevision.value += 1
  }

  const summaryByMonth = reactive(
    new Map<
      string,
      {
        initialBalance: number
        operations: Partial<Record<string, Array<Operation | VirtualInvoiceLine>>>
        realizedBalance: number
        scheduledInvoiceTotalInCents: number
        scheduledFutureOperationsTotalInCents: number
      }
    >(),
  )

  const monthOperations = computed(() => {
    if (!month.value) throw new Error('Operações por mês: nenhum mês selecionado')
    if (!summaryByMonth.has(month.value)) throw new Error('Mês solicitado não contém operações')
    return summaryByMonth.get(month.value)!.operations
  })
  const hasLoadedSelectedMonthSummary = computed(() =>
    month.value ? summaryByMonth.has(month.value) : false,
  )
  const selectedMonthSummary = computed(() => {
    if (!month.value) throw new Error('Operações por mês: nenhum mês selecionado')
    if (!summaryByMonth.has(month.value)) throw new Error('Mês solicitado não contém operações')
    const monthSummary = summaryByMonth.get(month.value)!
    return {
      // Marcando com ! pois o mês já foi verificado acima com o summaryByMonth.has
      initialBalance: monthSummary.initialBalance,
      realizedBalance: monthSummary.realizedBalance,
      scheduledInvoiceTotalInCents: monthSummary.scheduledInvoiceTotalInCents,
      scheduledFutureOperationsTotalInCents: monthSummary.scheduledFutureOperationsTotalInCents,
    }
  })

  const monthOperationsSummary = computed(() => {
    if (!month.value) throw new Error('Operações por mês: nenhum mês selecionado')
    if (!summaryByMonth.has(month.value)) throw new Error('Mês solicitado não contém operações')
    const currentMonthSummary = summaryByMonth.get(month.value)!

    const summary: [
      string,
      {
        operations: Array<Operation | VirtualInvoiceLine> | undefined
        balance: number
        dayBalance: number
      },
    ][] = []

    Object.entries(currentMonthSummary.operations)
      .toReversed()
      .map(([date, operations]) => {
        return [
          date,
          { operations, total: operations?.reduce((acc, op) => acc + op.valueInCents, 0) ?? 0 },
        ] as const
      })
      .forEach(([date, dayValues], index) => {
        const daySummary = {
          operations: dayValues.operations,
          balance: 0,
          dayBalance: dayValues.total,
        }
        if (index === 0) {
          daySummary.balance = currentMonthSummary.initialBalance + dayValues.total
        } else {
          daySummary.balance = summary[index - 1]![1].balance + dayValues.total
        }
        summary.push([date, daySummary])
      })

    return {
      summaries: Object.fromEntries(summary.toReversed()),
      initialBalance: currentMonthSummary.initialBalance,
    }
  })

  function setScope(next: CenterScope) {
    scope.value = next
  }

  function notifyOperationSuccess(payload: OperationPayload) {
    if (payload.isCredit && payload.creditCard) {
      const count = Math.max(1, payload.installmentCount ?? 1)
      const cardName = payload.creditCard.name
      const cardId = payload.creditCard.id
      $q.notify({
        type: 'positive',
        message:
          count > 1
            ? `${count}x lançadas na fatura de ${cardName}`
            : `Compra lançada na fatura de ${cardName}`,
        actions: [
          {
            label: 'Ver fatura',
            color: 'white',
            handler: () => {
              void router.push({ name: 'invoices', query: { cardId } })
            },
          },
        ],
      })
      return
    }
    $q.notify({ type: 'positive', message: 'Operação lançada' })
  }

  function addOperation() {
    async function doAddOperation(payload: OperationPayload) {
      if (
        payload.center &&
        !centerStore.activeCenters.some((activeCenter) => activeCenter.id === payload.center!.id)
      ) {
        $q.notify({
          type: 'warning',
          message: 'Centro inativado. Escolha outro ou deixe sem centro.',
        })
        return
      }

      if (payload.recurrenceType === 'recurring') {
        if (!payload.recurrenceFrequency)
          throw new Error(
            'Frequência da recorrência não informada para operação de tipo recorrente',
          )
        try {
          await expensesDataSource.dataSource.manager.transaction(async (manager) => {
            const recurringRule = await addRecurringRule(
              {
                description: payload.description,
                valueInCents: payload.value,
                startDate: payload.date,
                nextRunDate: payload.date,
                category: payload.category,
                recurrenceFrequency: payload.recurrenceFrequency!,
                anchorDay: parseInt(dayjs(payload.date).format('DD')),
                center: payload.center,
              },
              {
                manager,
              },
            )
            await addOperations(
              {
                date: payload.date,
                category: payload.category,
                description: payload.description,
                center: payload.center,
              },
              { values: [payload.value], recurringRule: recurringRule, manager },
            )
          })
          await refreshDataForOperationDate(payload.date)
          await notificationService.rescheduleAll()
          notifyOperationSuccess(payload)
        } catch (error) {
          console.error(error)
        }
      } else {
        if (payload.isCredit) {
          if (!payload.creditCard) {
            throw new Error('Cartão de crédito não informado para compra no crédito')
          }
          if (!payload.creditCard.isActive) {
            throw new Error('Não é possível lançar compras em cartão inativo')
          }
        }
        const count = Math.max(1, payload.installmentCount ?? 1)
        const values = splitInInstallments(payload.value, count)
        try {
          await operationRepository.manager.transaction(async (manager) => {
            await addOperations(
              {
                date: payload.date,
                category: payload.category,
                description: payload.description,
                center: payload.center,
                notes: payload.notes,
                ...(payload.notificationEnabled
                  ? { notificationEnabled: payload.notificationEnabled }
                  : {}),
                ...(payload.notificationDaysBefore
                  ? { notificationDaysBefore: payload.notificationDaysBefore }
                  : {}),
                ...(payload.notificationTime ? { notificationTime: payload.notificationTime } : {}),
                creditCard: payload.isCredit ? (payload.creditCard ?? null) : null,
              },
              { values, manager },
            )
          })
          await refreshDataForOperationDate(payload.date)
          await notificationService.rescheduleAll()
          notifyOperationSuccess(payload)
        } catch (error) {
          console.error(error)
        }
      }
    }

    $q.dialog({
      component: OperationDialog,
      componentProps: {
        center: defaultFormCenter(scope.value, centerStore.activeCenters),
      },
      persistent: true,
    }).onOk((payload: OperationPayload) => {
      doAddOperation(payload).catch((error) => {
        console.error(error)
      })
    })
  }

  function editOperation(operation: Operation) {
    if (operation.isInvoicePayment) {
      $q.notify({
        type: 'warning',
        message:
          'Este lançamento é o pagamento de uma fatura. Estorne o pagamento na tela de Faturas.',
      })
      return
    }
    if (operation.isLockedByInvoice) {
      $q.notify({
        type: 'warning',
        message: 'Compra em fatura fechada. Reabra a fatura para editar.',
      })
      return
    }
    $q.dialog({
      component: OperationDialog,
      componentProps: {
        value: BRL(Math.abs(operation.valueInCents) / 100).format(),
        date: operation.date,
        category: operation.category,
        description: operation.description,
        operationType: operation.isExpense ? 'Saída' : 'Entrada',
        notes: operation.notes,
        notificationEnabled: operation.notificationEnabled ?? false,
        notificationDaysBefore: operation.notificationDaysBefore,
        notificationTime: operation.notificationTime,
        center: operation.center ?? null,
        lockCenter: true,
      },
      persistent: true,
    }).onOk(
      (payload: {
        value: number
        date: string
        category: Category
        description: string
        notes?: string
        notificationEnabled?: boolean
        notificationDaysBefore?: number
        notificationTime?: string
      }) => {
        const today = dayjs().format('YYYY-MM-DD')
        const isFuture = payload.date > today
        operation.valueInCents = payload.value
        operation.date = payload.date
        operation.category = payload.category
        operation.description = payload.description
        operation.notes = payload.notes ?? ''
        operation.notificationEnabled = isFuture ? (payload.notificationEnabled ?? false) : false
        if (isFuture && payload.notificationDaysBefore) {
          operation.notificationDaysBefore = payload.notificationDaysBefore
        }
        if (isFuture && payload.notificationTime) {
          operation.notificationTime = payload.notificationTime
        }
        operationRepository
          .save(operation)
          .then(async () => {
            await refreshDataForOperationDate(payload.date)
            await notificationService.rescheduleAll()
          })
          .catch((error) => {
            console.error(error)
          })
      },
    )
  }

  function removeOperation(operation: Operation) {
    if (operation.isInvoicePayment) {
      $q.notify({
        type: 'warning',
        message:
          'Este lançamento é o pagamento de uma fatura. Estorne o pagamento na tela de Faturas.',
      })
      return
    }
    if (operation.isLockedByInvoice) {
      $q.notify({
        type: 'warning',
        message: 'Compra em fatura fechada. Reabra a fatura para excluir.',
      })
      return
    }
    $q.dialog({
      title: 'Excluir operação?',
      message: 'Esta operação é irreversível',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      operationRepository
        .remove(operation)
        .then(async () => {
          await refreshData()
          await notificationService.rescheduleAll()
        })
        .catch((error) => {
          console.error(error)
        })
    })
  }

  function copyOperation(operation: Operation) {
    if (operation.isInvoicePayment) {
      $q.notify({
        type: 'warning',
        message:
          'Este lançamento é o pagamento de uma fatura. Estorne o pagamento na tela de Faturas.',
      })
      return
    }

    $q.dialog({
      component: OperationDialog,
      componentProps: {
        value: BRL(Math.abs(operation.valueInCents) / 100).format(),
        date: operation.date,
        category: operation.category,
        description: operation.description,
        operationType: operation.isExpense ? 'Saída' : 'Entrada',
        notes: operation.notes,
        center: operation.center ?? null,
      },
      persistent: true,
    }).onOk(
      (payload: {
        value: number
        date: string
        category: Category
        description: string
        notes?: string
        notificationEnabled?: boolean
        notificationDaysBefore?: number
        notificationTime?: string
        center: Center | null
      }) => {
        const today = dayjs().format('YYYY-MM-DD')
        const isFuture = payload.date > today
        const newOperation = new Operation()
        newOperation.valueInCents = payload.value
        newOperation.date = payload.date
        newOperation.category = payload.category
        newOperation.description = payload.description
        newOperation.notes = payload.notes ?? ''
        newOperation.center = payload.center
        newOperation.notificationEnabled = isFuture ? (payload.notificationEnabled ?? false) : false
        if (isFuture && payload.notificationDaysBefore) {
          newOperation.notificationDaysBefore = payload.notificationDaysBefore
        }
        if (isFuture && payload.notificationTime) {
          newOperation.notificationTime = payload.notificationTime
        }
        operationRepository
          .save(newOperation)
          .then(async () => {
            await refreshDataForOperationDate(payload.date)
            await notificationService.rescheduleAll()
          })
          .catch((error) => {
            console.error(error)
          })
      },
    )
  }

  async function transferOperationToCenter(operation: Operation, center: Center | null) {
    if (operation.isInvoicePayment) {
      $q.notify({
        type: 'warning',
        message:
          'Este lançamento é o pagamento de uma fatura. Estorne o pagamento na tela de Faturas.',
      })
      return
    }
    operation.center = center
    await operationRepository.save(operation)
    await refreshData()
  }

  async function getOperationsByCategory(monthValue?: string) {
    const manager = expensesDataSource.dataSource.manager
    const [income, expenses] = await Promise.all([
      sumOperationsByCategory(manager, scope.value, 'Entrada', monthValue),
      sumOperationsByCategory(manager, scope.value, 'Saída', monthValue),
    ])
    return { income, expenses }
  }

  async function getMonthGroups() {
    const manager = expensesDataSource.dataSource.manager
    const [dbMonths, scheduledInvoiceMonths, unpaidInvoiceLines] = await Promise.all([
      listCashMonths(manager, scope.value),
      listInvoiceReferenceMonths(manager, scope.value),
      getUnpaidInvoiceCenterLines(manager, scope.value),
    ])
    const monthValues = new Map(
      dbMonths.map((month) => [`${month.year}-${month.month}`, `${month.year}-${month.month}`]),
    )
    for (const referenceMonth of scheduledInvoiceMonths) {
      monthValues.set(referenceMonth, referenceMonth)
    }
    // Garante a aba do mês de vencimento de cada lançamento virtual (HIST-04):
    // ele é ancorado em dueDate, que pode cair num mês de referência diferente do fechamento.
    for (const line of unpaidInvoiceLines) {
      const dueMonth = line.dueDate.slice(0, 7)
      monthValues.set(dueMonth, dueMonth)
    }
    return [...monthValues.values()].sort().map((value) => ({
      label: dayjs(value).format('MMM YYYY'),
      value,
    }))
  }

  function getMonthToSelect() {
    const currentMonth = dayjs().format('YYYY-MM')
    return months.value.some((m) => m.value === currentMonth)
      ? currentMonth
      : months.value[months.value.length - 1]?.value
  }

  async function refreshMonthGroups() {
    months.value = await getMonthGroups()
    if (!month.value || !months.value.some((m) => m.value === month.value)) {
      month.value = getMonthToSelect()
    }
    summaryByMonth.clear()
  }

  async function refreshSummary() {
    if (typeof month.value === 'undefined') return

    const manager = expensesDataSource.dataSource.manager

    const initialBalance = await sumCashBalanceBeforeMonth(manager, scope.value, month.value)
    const operations = await listCashOperationsOfMonth(manager, scope.value, month.value)
    // Corte entre o que já saiu do centro (realizado) e o que ainda vai sair (agendado):
    // hoje, ou o fim do mês selecionado, o que vier primeiro (mês passado = mês inteiro
    // realizado; mês futuro = nada realizado ainda).
    const today = dayjs().format('YYYY-MM-DD')
    const endOfMonth = dayjs(month.value).endOf('month').format('YYYY-MM-DD')
    const cutoffDate = today < endOfMonth ? today : endOfMonth

    const realizedBalance = await sumCashBalanceUntil(manager, scope.value, cutoffDate)
    const scheduledFutureOperationsTotal = await sumScheduledCashOfMonthAfter(
      manager,
      scope.value,
      month.value,
      cutoffDate,
    )
    const scheduledInvoiceTotal = await sumInvoicePurchasesOfReferenceMonth(
      manager,
      scope.value,
      month.value,
    )
    const unpaidInvoiceLines = await getUnpaidInvoiceCenterLines(manager, scope.value)
    const virtualInvoiceLines = unpaidInvoiceLines
      .filter((line) => line.dueDate.slice(0, 7) === month.value)
      .map(toVirtualInvoiceLine)

    const operationsByDate = Object.groupBy(operations, ({ date }) => date)
    const virtualInvoiceLinesByDate = Object.groupBy(virtualInvoiceLines, ({ date }) => date)
    const mergedOperationsByDate: Partial<Record<string, Array<Operation | VirtualInvoiceLine>>> =
      {}
    for (const date of new Set([
      ...Object.keys(operationsByDate),
      ...Object.keys(virtualInvoiceLinesByDate),
    ])) {
      mergedOperationsByDate[date] = [
        ...(operationsByDate[date] ?? []),
        ...(virtualInvoiceLinesByDate[date] ?? []),
      ]
    }

    summaryByMonth.set(month.value, {
      operations: mergedOperationsByDate,
      initialBalance,
      realizedBalance,
      scheduledInvoiceTotalInCents: scheduledInvoiceTotal,
      scheduledFutureOperationsTotalInCents: scheduledFutureOperationsTotal,
    })
  }

  async function refreshData() {
    await refreshMonthGroups()
    await refreshSummary()
    bumpDataRevision()
  }

  async function refreshDataForOperationDate(operationDate: string) {
    await refreshMonthGroups()
    const operationMonth = operationDate.slice(0, 7)
    const hasOperationMonth = months.value.some((monthGroup) => monthGroup.value === operationMonth)

    if (hasOperationMonth && month.value !== operationMonth) {
      month.value = operationMonth
      bumpDataRevision()
      return
    }

    await refreshSummary()
    bumpDataRevision()
  }

  async function refreshScreen() {
    await reconcileInvoiceStatuses(expensesDataSource.dataSource.manager)
    await refreshMonthGroups()
    await refreshSummary()
    hasLoadedFirstTime.value = true
    bumpDataRevision()
  }

  async function refreshCenter() {
    await refreshScreen()
    month.value = getMonthToSelect()
  }

  watch(scope, async () => {
    await refreshCenter()
  })

  watch(month, async () => {
    await refreshSummary()
  })

  watch(
    () => centerStore.activeCenters,
    (centers) => {
      const next = reconcileScope(scope.value, centers)
      if (!isSameScope(next, scope.value)) scope.value = next
    },
  )

  return {
    scope,
    scopeLabel,
    month,
    months,
    hasLoadedFirstTime,
    dataRevision,
    summaryByMonth,
    monthOperations,
    hasLoadedSelectedMonthSummary,
    selectedMonthSummary,
    monthOperationsSummary,
    setScope,
    addOperation,
    editOperation,
    removeOperation,
    getOperationsByCategory,
    getMonthGroups,
    copyOperation,
    transferOperationToCenter,
    refreshScreen,
    refreshCenter,
  }
})

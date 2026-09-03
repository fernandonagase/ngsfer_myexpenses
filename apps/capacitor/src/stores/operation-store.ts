import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { BRL, splitInInstallments } from '@ngsfer-myexpenses/utils'

import {
  Category,
  Operation,
  RecurringRule,
  type CardInvoice,
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
  reconcileInvoiceStatuses,
} from 'src/databases/entities/expenses/card-invoice-helpers'

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
}

type OperationData = {
  date: string
  category: Category
  center: Center
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
  center: Center
  recurrenceFrequency: FrequencyType
  anchorDay: number
}

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)
const categoryOperation = expensesDataSource.dataSource.getRepository(Category) // renomear para categoryRepository

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
  const center = ref<Center | null>(null)
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
        operations: Partial<Record<string, Array<Operation>>>
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
      { operations: Array<Operation> | undefined; balance: number; dayBalance: number },
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

  function setCenter(newCenter: Center) {
    center.value = newCenter
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
      if (!center.value) throw new Error('Centro financeiro não informado')

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
                center: center.value!,
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
                center: center.value!,
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
                center: center.value!,
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
    if (!center.value) {
      throw new Error('Centro financeiro não informado')
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
        const newOperation = new Operation()
        newOperation.valueInCents = payload.value
        newOperation.date = payload.date
        newOperation.category = payload.category
        newOperation.description = payload.description
        newOperation.notes = payload.notes ?? ''
        newOperation.center = center.value!
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

  async function transferOperationToCenter(operation: Operation, center: Center) {
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
    const incomeQuery = categoryOperation
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.operations', 'operation')
      .select('category.name', 'category')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('operation.is_active = 1')
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere("category.type = 'Entrada'")
      .groupBy('category.name')
      .orderBy('SUM(operation.valueInCents)', 'DESC')

    const expensesQuery = categoryOperation
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.operations', 'operation')
      .select('category.name', 'category')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('operation.is_active = 1')
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere("category.type = 'Saída'")
      .groupBy('category.name')
      .orderBy('SUM(operation.valueInCents)', 'ASC')

    if (monthValue) {
      const year = monthValue.slice(0, 4)
      const monthIndex = monthValue.slice(5, 7)
      incomeQuery
        .andWhere("STRFTIME('%Y', operation.date) = :year", { year })
        .andWhere("STRFTIME('%m', operation.date) = :monthIndex", { monthIndex })
      expensesQuery
        .andWhere("STRFTIME('%Y', operation.date) = :year", { year })
        .andWhere("STRFTIME('%m', operation.date) = :monthIndex", { monthIndex })
    }

    const [income, expenses] = await Promise.all([
      incomeQuery.getRawMany(),
      expensesQuery.getRawMany(),
    ])
    return { income, expenses }
  }

  async function getCurrentCenterMonths(): Promise<Array<{ month: string; year: string }>> {
    return await operationRepository
      .createQueryBuilder('operation')
      .select("STRFTIME('%m', operation.date)", 'month')
      .addSelect("STRFTIME('%Y', date)", 'year')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)')
      .groupBy('month')
      .addGroupBy('year')
      .orderBy('year')
      .addOrderBy('month')
      .getRawMany()
  }

  /**
   * Meses de referência de faturas com compras lançadas no centro atual, mesmo quando o
   * mês não tem nenhuma outra movimentação de caixa — sem isso, a aba do mês nunca aparece
   * e "Valores agendados" fica sem lugar para ser mostrado.
   */
  async function getCurrentCenterScheduledInvoiceMonths(): Promise<string[]> {
    const rows = await operationRepository
      .createQueryBuilder('operation')
      .innerJoin('operation.cardInvoice', 'invoice')
      .select('invoice.mes_referencia', 'referenceMonth')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('invoice.is_active = 1')
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .groupBy('invoice.mes_referencia')
      .getRawMany<{ referenceMonth: string }>()
    return rows.map((row) => row.referenceMonth)
  }

  async function getMonthGroups() {
    const [dbMonths, scheduledInvoiceMonths] = await Promise.all([
      getCurrentCenterMonths(),
      getCurrentCenterScheduledInvoiceMonths(),
    ])
    const monthValues = new Map(
      dbMonths.map((month) => [`${month.year}-${month.month}`, `${month.year}-${month.month}`]),
    )
    for (const referenceMonth of scheduledInvoiceMonths) {
      monthValues.set(referenceMonth, referenceMonth)
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
    if (!center.value) return
    if (typeof month.value === 'undefined') return

    // Compras no crédito não entram no saldo/lista de caixa
    const excludeCardPurchases =
      'NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)'

    const initialBalance = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('operation.is_active = 1')
      .andWhere(excludeCardPurchases)
      .andWhere('SUBSTR(operation.date, 0, 8) < :month', { month: month.value })
      .getRawOne()
    const operations = await operationRepository
      .createQueryBuilder('operation')
      .leftJoinAndSelect('operation.category', 'category')
      .leftJoinAndSelect('operation.recurringRule', 'recurringRule')
      .leftJoinAndSelect('operation.cardInvoice', 'cardInvoice')
      .leftJoinAndSelect('cardInvoice.creditCard', 'creditCard')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('operation.is_active = 1')
      .andWhere(excludeCardPurchases)
      .andWhere("STRFTIME('%m', operation.date) = :monthIndex", {
        monthIndex: month.value.slice(5, 7),
      })
      .andWhere("STRFTIME('%Y', operation.date) = :year", { year: month.value.slice(0, 4) })
      .orderBy('operation.date', 'DESC')
      .getMany()
    // Corte entre o que já saiu do centro (realizado) e o que ainda vai sair (agendado):
    // hoje, ou o fim do mês selecionado, o que vier primeiro (mês passado = mês inteiro
    // realizado; mês futuro = nada realizado ainda).
    const today = dayjs().format('YYYY-MM-DD')
    const endOfMonth = dayjs(month.value).endOf('month').format('YYYY-MM-DD')
    const cutoffDate = today < endOfMonth ? today : endOfMonth

    const realizedBalance = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('operation.is_active = 1')
      .andWhere(excludeCardPurchases)
      .andWhere('operation.date <= :cutoffDate', { cutoffDate })
      .getRawOne()
    const scheduledFutureOperationsTotal = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('operation.is_active = 1')
      .andWhere(excludeCardPurchases)
      .andWhere("STRFTIME('%m', operation.date) = :monthIndex", {
        monthIndex: month.value.slice(5, 7),
      })
      .andWhere("STRFTIME('%Y', operation.date) = :year", { year: month.value.slice(0, 4) })
      .andWhere('operation.date > :cutoffDate', { cutoffDate })
      .getRawOne()
    const scheduledInvoiceTotal = await operationRepository
      .createQueryBuilder('operation')
      .innerJoin('operation.cardInvoice', 'invoice')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('invoice.mes_referencia = :month', { month: month.value })
      .andWhere('invoice.is_active = 1')
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .getRawOne()
    summaryByMonth.set(month.value, {
      operations: Object.groupBy(operations, ({ date }) => date),
      initialBalance: initialBalance.Total,
      realizedBalance: realizedBalance.Total,
      scheduledInvoiceTotalInCents: scheduledInvoiceTotal.Total ?? 0,
      scheduledFutureOperationsTotalInCents: scheduledFutureOperationsTotal.Total ?? 0,
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

  watch(center, async () => {
    await refreshCenter()
  })

  watch(month, async () => {
    await refreshSummary()
  })

  return {
    center,
    month,
    months,
    hasLoadedFirstTime,
    dataRevision,
    summaryByMonth,
    monthOperations,
    hasLoadedSelectedMonthSummary,
    selectedMonthSummary,
    monthOperationsSummary,
    setCenter,
    addOperation,
    editOperation,
    removeOperation,
    getOperationsByCategory,
    getMonthGroups,
    copyOperation,
    transferOperationToCenter,
    refreshScreen,
  }
})

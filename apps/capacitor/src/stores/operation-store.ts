import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { BRL, splitInInstallments } from '@ngsfer-myexpenses/utils'

import { Category, RecurringRule } from 'src/databases/entities/expenses'
import { Operation, type Center } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import OperationDialog from 'src/components/operation/OperationDialog.vue'
import { type RecurrenceType } from 'src/components/operation/recurrence-types'
import { type EntityManager } from 'typeorm'
import {
  type FrequencyType,
  RecurringRuleType,
} from 'src/databases/entities/expenses/recurring-rule'
import { notificationService } from 'src/services/notification-service'

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

function addOperations(
  operationData: OperationData,
  {
    values,
    recurringRule,
    manager,
  }: { values: number[]; recurringRule?: RecurringRule; manager: EntityManager },
) {
  const today = dayjs().format('YYYY-MM-DD')
  const operations = values.map((valueInCents, index) => {
    const operationDate = dayjs(operationData.date).add(index, 'month').format('YYYY-MM-DD')
    const isFuture = operationDate > today
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
    })
    if (recurringRule) {
      operation.setRecurringRule(recurringRule)
    }
    return operation
  })
  return manager.save(Operation, operations)
}

export const useOperationStore = defineStore('operation', () => {
  const $q = useQuasar()
  const center = ref<Center | null>(null)
  const months = ref<Array<{ label: string; value: string }>>([])
  const month = ref<string>()
  const hasLoadedFirstTime = ref(false)

  const summaryByMonth = reactive(
    new Map<
      string,
      {
        initialBalance: number
        operations: Partial<Record<string, Array<Operation>>>
        finalBalance: number
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
    return {
      // Marcando com ! pois o mês já foi verificado acima com o summaryByMonth.has
      initialBalance: summaryByMonth.get(month.value)!.initialBalance,
      finalBalance: summaryByMonth.get(month.value)!.finalBalance,
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
      finalBalance: currentMonthSummary.finalBalance,
    }
  })

  function setCenter(newCenter: Center) {
    center.value = newCenter
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
        } catch (error) {
          console.error(error)
        }
      } else {
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
              },
              { values, manager },
            )
          })
          await refreshDataForOperationDate(payload.date)
          await notificationService.rescheduleAll()
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
    operation.center = center
    await operationRepository.save(operation)
    await refreshData()
  }

  async function getOperationsByCategory() {
    const income = await categoryOperation
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.operations', 'operation')
      .select('category.name', 'category')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('operation.is_active = 1')
      .andWhere("category.type = 'Entrada'")
      .groupBy('category.name')
      .orderBy('SUM(operation.valueInCents)', 'DESC')
      .getRawMany()
    const expenses = await categoryOperation
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.operations', 'operation')
      .select('category.name', 'category')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .andWhere('operation.is_active = 1')
      .andWhere("category.type = 'Saída'")
      .groupBy('category.name')
      .orderBy('SUM(operation.valueInCents)', 'ASC')
      .getRawMany()
    return { income, expenses }
  }

  async function getCurrentCenterMonths(): Promise<Array<{ month: string; year: string }>> {
    return await operationRepository
      .createQueryBuilder('operation')
      .select("STRFTIME('%m', operation.date)", 'month')
      .addSelect("STRFTIME('%Y', date)", 'year')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
      .groupBy('month')
      .addGroupBy('year')
      .orderBy('year')
      .addOrderBy('month')
      .getRawMany()
  }

  async function getMonthGroups() {
    const dbMonths = await getCurrentCenterMonths()
    return dbMonths.map((month) => ({
      label: dayjs(`${month.year}-${month.month}`).format('MMM YYYY'),
      value: `${month.year}-${month.month}`,
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
    const initialBalance = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('SUBSTR(operation.date, 0, 8) < :month', { month: month.value })
      .getRawOne()
    const operations = await operationRepository
      .createQueryBuilder('operation')
      .leftJoinAndSelect('operation.category', 'category')
      .leftJoinAndSelect('operation.recurringRule', 'recurringRule')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere("STRFTIME('%m', operation.date) = :monthIndex", {
        monthIndex: month.value.slice(5, 7),
      })
      .andWhere("STRFTIME('%Y', operation.date) = :year", { year: month.value.slice(0, 4) })
      .orderBy('operation.date', 'DESC')
      .getMany()
    const finalBalance = await operationRepository
      .createQueryBuilder('operation')
      .select('SUM(operation.valueInCents)', 'Total')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
      .andWhere('SUBSTR(operation.date, 0, 8) <= :month', { month: month.value })
      .getRawOne()
    summaryByMonth.set(month.value, {
      operations: Object.groupBy(operations, ({ date }) => date),
      initialBalance: initialBalance.Total,
      finalBalance: finalBalance.Total,
    })
  }

  async function refreshData() {
    await refreshMonthGroups()
    await refreshSummary()
  }

  async function refreshDataForOperationDate(operationDate: string) {
    await refreshMonthGroups()
    const operationMonth = operationDate.slice(0, 7)
    const hasOperationMonth = months.value.some((monthGroup) => monthGroup.value === operationMonth)

    if (hasOperationMonth && month.value !== operationMonth) {
      month.value = operationMonth
      return
    }

    await refreshSummary()
  }

  async function refreshScreen() {
    await refreshMonthGroups()
    await refreshSummary()
    hasLoadedFirstTime.value = true
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

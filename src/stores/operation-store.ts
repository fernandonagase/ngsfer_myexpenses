import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'

import { Category } from 'src/databases/entities/expenses'
import { Operation, type Center } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import OperationDialog from 'src/components/operation/OperationDialog.vue'
import OperationByCategoryDialog from 'src/components/reports/OperationByCategoryDialog.vue'

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)
const categoryOperation = expensesDataSource.dataSource.getRepository(Category) // renomear para categoryRepository

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

  function setCenter(newCenter: Center) {
    center.value = newCenter
  }

  function addOperation() {
    $q.dialog({
      component: OperationDialog,
      persistent: true,
    }).onOk((payload: { value: number; date: string; category: Category; description: string }) => {
      const operation = new Operation()
      operation.valueInCents = payload.value
      operation.date = payload.date
      operation.category = payload.category
      operation.description = payload.description
      if (!center.value) {
        throw new Error('Centro financeiro não informado')
      }
      operation.center = center.value
      operationRepository
        .save(operation)
        .then(async () => {
          await refreshData()
        })
        .catch((error) => {
          console.error(error)
        })
    })
  }

  function editOperation(operation: Operation) {
    $q.dialog({
      component: OperationDialog,
      componentProps: {
        value: operation.valueString,
        date: operation.date,
        category: operation.category,
        description: operation.description,
      },
      persistent: true,
    }).onOk((payload: { value: number; date: string; category: Category; description: string }) => {
      operation.valueInCents = payload.value
      operation.date = payload.date
      operation.category = payload.category
      operation.description = payload.description
      operationRepository
        .save(operation)
        .then(async () => {
          await refreshData()
        })
        .catch((error) => {
          console.error(error)
        })
    })
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
        })
        .catch((error) => {
          console.error(error)
        })
    })
  }

  async function copyOperation(operation: Operation) {
    if (!center.value) {
      throw new Error('Centro financeiro não informado')
    }
    const newOperation = new Operation()
    newOperation.valueInCents = operation.valueInCents
    newOperation.date = operation.date
    newOperation.category = operation.category
    newOperation.description = operation.description
    newOperation.center = center.value
    await operationRepository.save(newOperation)
    await refreshData()
  }

  async function transferOperationToCenter(operation: Operation, center: Center) {
    operation.center = center
    await operationRepository.save(operation)
    await refreshData()
  }

  function showOperationsByCategory() {
    $q.dialog({
      component: OperationByCategoryDialog,
    })
  }

  async function getOperationsByCategory() {
    const income = await categoryOperation
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.operations', 'operation')
      .select('category.name', 'category')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id = :centerId', { centerId: center.value?.id })
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
      label: dayjs(`${month.year}-${month.month}`).format('MMM/YYYY'),
      value: `${month.year}-${month.month}`,
    }))
  }

  async function refreshMonthGroups() {
    months.value = await getMonthGroups()
    // Selecione o último mês da lista
    month.value = months.value[months.value.length - 1]?.value
  }

  async function refreshData() {
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

  watch(center, async () => {
    await refreshMonthGroups()
    summaryByMonth.clear()
    hasLoadedFirstTime.value = true
  })

  watch(month, async () => {
    await refreshData()
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
    setCenter,
    addOperation,
    editOperation,
    removeOperation,
    showOperationsByCategory,
    getOperationsByCategory,
    getMonthGroups,
    copyOperation,
    transferOperationToCenter,
  }
})

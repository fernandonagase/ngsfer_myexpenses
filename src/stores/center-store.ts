import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'

import { Operation, type Center } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import NewOperationDialog from 'src/components/operation/NewOperationDialog.vue'

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

export const useCenterStore = defineStore('center', () => {
  const $q = useQuasar()
  const center = ref<Center | null>(null)

  const operations = computed(() => center.value?.operations ?? [])

  function setCenter(newCenter: Center) {
    center.value = newCenter
  }

  function addOperation() {
    $q.dialog({
      component: NewOperationDialog,
      persistent: true,
    }).onOk((payload: { value: number; date: string; description: string }) => {
      const operation = new Operation()
      operation.valueInCents = payload.value
      operation.date = payload.date
      operation.description = payload.description
      if (!center.value) {
        throw new Error('Centro financeiro não informado')
      }
      operation.center = center.value
      void operationRepository.save(operation)
      center.value.operations = [...operations.value, operation]
    })
  }

  watch(center, async () => {
    if (center.value) {
      const operations = await operationRepository
        .createQueryBuilder('operation')
        .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
        .getMany()
      center.value.operations = operations
    }
  })

  return { center, operations, setCenter, addOperation }
})

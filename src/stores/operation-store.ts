import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'

import type { Category } from 'src/databases/entities/expenses'
import { Operation, type Center } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import OperationDialog from 'src/components/operation/OperationDialog.vue'

const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

export const useOperationStore = defineStore('operation', () => {
  const $q = useQuasar()
  const center = ref<Center | null>(null)

  const operations = computed(() => center.value?.operations ?? [])
  const totalInCents = computed(() =>
    center.value?.operations
      ? center.value.operations.reduce((acc, next) => acc + next.valueInCents, 0)
      : 0,
  )

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
      void operationRepository.save(operation)
      center.value.operations = [...operations.value, operation]
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
      void operationRepository.save(operation)
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
      const operationId = operation.id
      void operationRepository.remove(operation)
      if (!center.value) {
        // se nao ha centro nem operacoes, nao ha nada para fazer
        return
      }
      center.value.operations = center.value.operations.filter(
        (operation) => operation.id !== operationId,
      )
    })
  }

  watch(center, async () => {
    if (center.value) {
      const operations = await operationRepository
        .createQueryBuilder('operation')
        .leftJoinAndSelect('operation.category', 'category')
        .where('operation.centro_financeiro_id = :centerId', { centerId: center.value.id })
        .orderBy('operation.date', 'DESC')
        .getMany()
      center.value.operations = operations
    }
  })

  return {
    center,
    operations,
    totalInCents,
    setCenter,
    addOperation,
    editOperation,
    removeOperation,
  }
})

import { readonly, ref } from 'vue'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Operation } from 'src/databases/entities/expenses'

function useOperations() {
  const operations = ref<Operation[]>([])
  const repository = expensesDataSource.dataSource.getRepository(Operation)

  async function findAllOperationsBy(centerId: number) {
    operations.value = await repository
      .createQueryBuilder('operation')
      .where('operation.centro_financeiro_id = :centerId', { centerId })
      .getMany()
  }

  async function addOperation(operation: Operation) {
    await repository.save(operation)
    operations.value = [...operations.value, operation]
  }

  async function removeOperationById(id: number) {
    await repository.delete(id)
    operations.value = operations.value.filter((operation) => operation.id !== id)
  }

  return {
    operations: readonly(operations),
    findAllOperationsBy,
    addOperation,
    removeOperationById,
  }
}

export { useOperations }

import { readonly, ref } from 'vue'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Operation } from 'src/databases/entities/expenses'

function useOperations() {
  const operations = ref<Operation[]>([])
  const repository = expensesDataSource.dataSource.getRepository(Operation)

  async function findAllOperations() {
    operations.value = await repository.find()
  }

  async function addOperation(operation: Operation) {
    await repository.save(operation)
    operations.value = [...operations.value, operation]
  }

  async function removeOperationById(id: number) {
    await repository.delete(id)
    operations.value = operations.value.filter((operation) => operation.id !== id)
  }

  return { operations: readonly(operations), findAllOperations, addOperation, removeOperationById }
}

export { useOperations }

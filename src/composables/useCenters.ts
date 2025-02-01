import { readonly, ref } from 'vue'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Center } from 'src/databases/entities/expenses'

function useCenters() {
  const centers = ref<Center[]>([])
  const repository = expensesDataSource.dataSource.getRepository(Center)

  async function findAllCenters() {
    centers.value = await repository.find()
  }

  async function addCenter(center: Center) {
    await repository.save(center)
    centers.value = [...centers.value, center]
  }

  async function removeCenterById(id: number) {
    await repository.delete(id)
    centers.value = centers.value.filter((center) => center.id !== id)
  }

  return { centers: readonly(centers), findAllCenters, addCenter, removeCenterById }
}

export { useCenters }

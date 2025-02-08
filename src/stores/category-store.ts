import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'

import { Category } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import CategoryManagementDialog from 'src/components/category/CategoryManagementDialog.vue'

const categoryRepository = expensesDataSource.dataSource.getRepository(Category)

export const useCategoryStore = defineStore('category', () => {
  const $q = useQuasar()

  const datasetInput = ref<Array<Category>>([])
  const datasetOutput = ref<Array<Category>>([])

  async function fetch() {
    datasetInput.value = await categoryRepository.find({ where: { type: 'Entrada' } })
    datasetOutput.value = await categoryRepository.find({ where: { type: 'Saída' } })
  }

  function showCategories() {
    $q.dialog({
      component: CategoryManagementDialog,
      persistent: true,
    })
  }

  function addCategory({ type }: { type: CategoryType }) {
    $q.dialog({
      title: 'Nova categoria',
      prompt: {
        model: '',
        type: 'text',
      },
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk((name) => {
      const category = new Category()
      category.name = name
      category.type = type
      void categoryRepository.save(category)
      if (type === 'Entrada') {
        datasetInput.value = [...datasetInput.value, category]
      } else {
        datasetOutput.value = [...datasetOutput.value, category]
      }
    })
  }

  function editCategory(category: Category) {
    $q.dialog({
      title: 'Categoria',
      prompt: {
        model: category.name,
        type: 'text',
      },
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk((name) => {
      category.name = name
      void categoryRepository.save(category)
    })
  }

  function removeCategory(category: Category) {
    $q.dialog({
      title: 'Excluir categoria?',
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
      if (category.isDefault) {
        $q.notify({
          type: 'negative',
          message: `Falha ao excluir categoria`,
          caption: 'Não é permitido excluir uma categoria padrão',
        })
        return
      }
      let categoryIndex = -1
      if (category.type === 'Entrada') {
        categoryIndex = datasetInput.value.findIndex((element) => element.id === category.id)
      } else {
        categoryIndex = datasetOutput.value.findIndex((element) => element.id === category.id)
      }
      categoryRepository
        .remove(category)
        .then(() => {
          if (category.type === 'Entrada') {
            datasetInput.value = datasetInput.value.filter((_, index) => index !== categoryIndex)
          } else {
            datasetOutput.value = datasetOutput.value.filter((_, index) => index !== categoryIndex)
          }
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: `Falha ao excluir categoria`,
            caption: error.message,
          })
        })
    })
  }

  return {
    datasetInput,
    datasetOutput,
    fetch,
    showCategories,
    addCategory,
    editCategory,
    removeCategory,
  }
})

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

import { Category, Operation, RecurringRule } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import CategoryFormDialog from 'src/components/category/CategoryFormDialog.vue'
import ConfirmSheetDialog from 'src/components/ConfirmSheetDialog.vue'

export type CategoryFormPayload = {
  name: string
  type: CategoryType
  isDefault: boolean
}

const categoryRepository = expensesDataSource.dataSource.getRepository(Category)
const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

export const useCategoryStore = defineStore('category', () => {
  const $q = useQuasar()
  const router = useRouter()

  const datasetInput = ref<Array<Category>>([])
  const datasetOutput = ref<Array<Category>>([])

  async function fetch() {
    datasetInput.value = await categoryRepository.find({
      where: { type: 'Entrada', isSystem: false },
      order: { id: 'ASC' },
    })
    datasetOutput.value = await categoryRepository.find({
      where: { type: 'Saída', isSystem: false },
      order: { id: 'ASC' },
    })
  }

  function showCategories() {
    void router.push({ name: 'categories' })
  }

  /** Nº de operações ativas do ano corrente por categoria (id → contagem). */
  async function countOperationsThisYear(): Promise<Record<number, number>> {
    const start = dayjs().startOf('year').format('YYYY-MM-DD')
    const end = dayjs().endOf('year').format('YYYY-MM-DD')
    const rows = await operationRepository
      .createQueryBuilder('operation')
      .select('operation.category_id', 'categoryId')
      .addSelect('COUNT(operation.id)', 'count')
      .where('operation.is_active = 1')
      .andWhere('operation.date BETWEEN :start AND :end', { start, end })
      .groupBy('operation.category_id')
      .getRawMany<{ categoryId: number; count: number }>()
    const counts: Record<number, number> = {}
    for (const row of rows) counts[Number(row.categoryId)] = Number(row.count)
    return counts
  }

  function openCategoryForm(initial: {
    title: string
    name?: string
    type: CategoryType
    isDefault?: boolean
    lockType?: boolean
  }) {
    return new Promise<CategoryFormPayload | null>((resolve) => {
      $q.dialog({
        component: CategoryFormDialog,
        componentProps: initial,
        persistent: true,
      })
        .onOk((payload: CategoryFormPayload) => resolve(payload))
        .onCancel(() => resolve(null))
    })
  }

  function notifyError(message: string, error: unknown) {
    $q.notify({
      type: 'negative',
      message,
      caption: error instanceof Error ? error.message : String(error),
    })
  }

  /** Marca `category` como padrão do seu tipo e desmarca as demais. */
  async function persistDefault(category: Category) {
    await expensesDataSource.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(Category)
        .set({ isDefault: false })
        .where('type = :type', { type: category.type })
        .execute()
      await manager
        .createQueryBuilder()
        .update(Category)
        .set({ isDefault: true })
        .where('id = :id', { id: category.id })
        .execute()
    })
  }

  function addCategory({ type }: { type: CategoryType }) {
    void openCategoryForm({ title: `Nova categoria de ${type.toLowerCase()}`, type }).then(
      async (payload) => {
        if (!payload) return
        const category = new Category()
        category.name = payload.name
        category.type = payload.type
        category.isDefault = false
        try {
          await categoryRepository.save(category)
          if (payload.isDefault) await persistDefault(category)
          await fetch()
          $q.notify({ type: 'positive', message: `Categoria "${category.name}" criada` })
        } catch (error) {
          notifyError('Falha ao criar categoria', error)
        }
      },
    )
  }

  /** Cria várias categorias de uma vez (sugestões do estado vazio). */
  async function addCategories(names: string[], type: CategoryType) {
    if (names.length === 0) return
    try {
      await categoryRepository.save(
        names.map((name) => {
          const category = new Category()
          category.name = name
          category.type = type
          category.isDefault = false
          return category
        }),
      )
      await fetch()
      $q.notify({
        type: 'positive',
        message:
          names.length === 1
            ? `Categoria "${names[0]}" criada`
            : `${names.length} categorias criadas`,
      })
    } catch (error) {
      notifyError('Falha ao criar categorias', error)
    }
  }

  function editCategory(category: Category) {
    void openCategoryForm({
      title: 'Editar categoria',
      name: category.name,
      type: category.type,
      isDefault: category.isDefault,
      lockType: true,
    }).then(async (payload) => {
      if (!payload) return
      try {
        category.name = payload.name
        await categoryRepository.save(category)
        if (payload.isDefault && !category.isDefault) await persistDefault(category)
        await fetch()
        $q.notify({ type: 'positive', message: 'Alterações salvas' })
      } catch (error) {
        notifyError('Falha ao salvar categoria', error)
      }
    })
  }

  async function setDefaultCategory(category: Category) {
    try {
      await persistDefault(category)
      await fetch()
      $q.notify({
        type: 'positive',
        message: `"${category.name}" agora é a categoria padrão de ${category.type.toLowerCase()}`,
      })
    } catch (error) {
      notifyError('Falha ao definir categoria padrão', error)
    }
  }

  function removeCategory(category: Category, operationCount = 0) {
    if (category.isDefault) {
      $q.notify({
        type: 'warning',
        message: 'A categoria padrão não pode ser excluída',
        caption: 'Defina outra como padrão antes de excluir esta.',
      })
      return
    }
    const fallback = (category.type === 'Entrada' ? datasetInput.value : datasetOutput.value).find(
      (item) => item.isDefault,
    )
    if (!fallback) {
      $q.notify({
        type: 'warning',
        message: 'Nenhuma categoria padrão para receber as operações',
        caption: `Defina uma categoria padrão de ${category.type.toLowerCase()} antes de excluir.`,
      })
      return
    }

    const message =
      operationCount > 0
        ? `As ${operationCount} operações desta categoria passam para "${fallback.name}". Isso não pode ser desfeito.`
        : 'Isso não pode ser desfeito.'

    $q.dialog({
      component: ConfirmSheetDialog,
      componentProps: {
        title: 'Excluir categoria?',
        message,
        confirmLabel: 'Excluir',
        destructive: true,
      },
    }).onOk(() => {
      expensesDataSource.dataSource
        .transaction(async (manager) => {
          await manager
            .createQueryBuilder()
            .update(Operation)
            .set({ category: fallback })
            .where('category_id = :id', { id: category.id })
            .execute()
          await manager
            .createQueryBuilder()
            .update(RecurringRule)
            .set({ category: fallback })
            .where('category_id = :id', { id: category.id })
            .execute()
          await manager.delete(Category, category.id)
        })
        .then(async () => {
          await fetch()
          $q.notify({ type: 'positive', message: `Categoria "${category.name}" excluída` })
        })
        .catch((error) => notifyError('Falha ao excluir categoria', error))
    })
  }

  return {
    datasetInput,
    datasetOutput,
    fetch,
    showCategories,
    countOperationsThisYear,
    addCategory,
    addCategories,
    editCategory,
    setDefaultCategory,
    removeCategory,
  }
})

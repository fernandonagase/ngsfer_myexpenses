<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import BottomCta from 'src/components/shell/BottomCta.vue'
import ActionSheetDialog, { type SheetAction } from 'src/components/ActionSheetDialog.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RegistryEmptyState from 'src/components/RegistryEmptyState.vue'
import type { Category } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { categoryIcon } from 'src/helpers/category-icons'
import { useCategoryStore } from 'src/stores/category-store'
import { useOperationStore } from 'src/stores/operation-store'

const $q = useQuasar()
const categoryStore = useCategoryStore()
const operationStore = useOperationStore()

const tab = ref<CategoryType>('Saída')
const counts = ref<Record<number, number>>({})

const SUGGESTIONS: Record<CategoryType, string[]> = {
  Saída: ['Mercado', 'Alimentação', 'Transporte', 'Moradia', 'Assinaturas', 'Saúde'],
  Entrada: ['Salário', 'Freela', 'Reembolso'],
}

const tabs: Array<{ value: CategoryType; icon: string }> = [
  { value: 'Saída', icon: 'north_east' },
  { value: 'Entrada', icon: 'south_west' },
]

const listOf = (type: CategoryType) =>
  type === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput

const categories = computed(() => listOf(tab.value))
const isEmpty = computed(() => categories.value.length === 0)

const suggestions = computed(() =>
  SUGGESTIONS[tab.value].filter(
    (name) => !categories.value.some((c) => c.name.toLowerCase() === name.toLowerCase()),
  ),
)

const addLabel = computed(() => `Nova categoria de ${tab.value.toLowerCase()}`)

function countOf(category: Category) {
  return counts.value[category.id] ?? 0
}

function metaOf(category: Category) {
  const count = countOf(category)
  return `${count} ${count === 1 ? 'operação' : 'operações'} este ano`
}

async function loadCounts() {
  counts.value = await categoryStore.countOperationsThisYear()
}

onMounted(loadCounts)

watch(
  () => operationStore.dataRevision,
  () => {
    void loadCounts()
  },
)

function openActions(category: Category) {
  const actions: SheetAction[] = [{ value: 'edit', label: 'Editar', icon: 'edit' }]
  if (!category.isDefault) {
    actions.push({ value: 'default', label: 'Definir como padrão', icon: 'star' })
  }
  actions.push({ value: 'delete', label: 'Excluir', icon: 'delete', danger: true })

  $q.dialog({
    component: ActionSheetDialog,
    componentProps: {
      title: category.name,
      meta: `${category.type} · ${metaOf(category)}`,
      actions,
    },
  }).onOk((action: string) => {
    if (action === 'edit') categoryStore.editCategory(category)
    else if (action === 'default') void categoryStore.setDefaultCategory(category)
    else if (action === 'delete') categoryStore.removeCategory(category, countOf(category))
  })
}
</script>

<template>
  <q-page class="categories-page">
    <ScreenHeader title="Categorias" back hide-eye>
      <div class="type-switch">
        <button
          v-for="option in tabs"
          :key="option.value"
          type="button"
          class="type-switch__item"
          :class="{ 'type-switch__item--active': tab === option.value }"
          @click="tab = option.value"
        >
          <q-icon :name="option.icon" size="17px" />
          {{ option.value }} · {{ listOf(option.value).length }}
        </button>
      </div>
    </ScreenHeader>

    <ScreenBody bottom-padding="110px">
      <ErrorBoundary>
        <template v-if="isEmpty">
          <RegistryEmptyState
            icon="sell"
            :title="`Nenhuma categoria de ${tab.toLowerCase()}`"
            body="Categorias mostram para onde o dinheiro vai e alimentam os gráficos da tela inicial. Escolha uma sugestão abaixo ou crie a sua."
            :add-label="addLabel"
            hint="Você pode renomear, definir a padrão e excluir depois — nada disso trava lançamentos."
            @add="categoryStore.addCategory({ type: tab })"
          >
            <div v-if="suggestions.length > 0" class="ds-card suggestions">
              <div class="ds-section-label">Começar rápido</div>
              <div class="suggestions__chips">
                <button
                  v-for="name in suggestions"
                  :key="name"
                  type="button"
                  class="suggestions__chip"
                  @click="categoryStore.addCategories([name], tab)"
                >
                  <q-icon name="add" size="16px" />
                  {{ name }}
                </button>
              </div>
              <button
                type="button"
                class="suggestions__all"
                @click="categoryStore.addCategories(suggestions, tab)"
              >
                Adicionar todas
              </button>
            </div>
          </RegistryEmptyState>
        </template>

        <template v-else>
          <div class="ds-card list">
            <div
              v-for="category in categories"
              :key="category.id"
              class="ds-row ds-row--clickable"
              @click="openActions(category)"
            >
              <div class="ds-avatar">
                <q-icon :name="categoryIcon(category.name)" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="list__title-row">
                  <span class="ds-row__title">{{ category.name }}</span>
                  <span v-if="category.isDefault" class="ds-badge ds-badge--income ds-badge--tag">
                    Padrão
                  </span>
                </div>
                <div class="ds-row__meta">{{ metaOf(category) }}</div>
              </div>
              <q-icon name="more_horiz" size="20px" class="ds-chevron" />
            </div>
          </div>
          <div class="ds-hint list__hint">
            A categoria padrão é sugerida ao lançar uma nova operação. Toque em uma categoria para
            editar, definir como padrão ou excluir.
          </div>
        </template>
      </ErrorBoundary>
    </ScreenBody>

    <BottomCta v-if="!isEmpty">
      <button
        type="button"
        class="ds-block-btn ds-block-btn--primary bottom-cta__primary"
        @click="categoryStore.addCategory({ type: tab })"
      >
        <q-icon name="add" size="20px" />
        {{ addLabel }}
      </button>
    </BottomCta>
  </q-page>
</template>

<style lang="scss" scoped>
.categories-page {
  background: var(--ds-surface);
}

.type-switch {
  display: flex;
  gap: 6px;
  background: var(--ds-header-pill);
  border-radius: 999px;
  padding: 4px;
}

.type-switch__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 0;
  border-radius: 999px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.type-switch__item--active {
  background: #fff;
  color: var(--ds-header);
}

.list {
  overflow: hidden;
}

.list__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.list__hint {
  padding: 0 4px;
}

.suggestions {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestions__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  padding: 9px 13px;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--ds-ink);
  cursor: pointer;

  .q-icon {
    color: var(--ds-accent);
  }

  &:active {
    border-color: var(--ds-header);
    background: #f3f7f5;
  }
}

.suggestions__all {
  align-self: flex-start;
  border: none;
  background: transparent;
  padding: 2px 0 0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--ds-accent);
  cursor: pointer;
}
</style>

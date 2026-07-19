<template>
  <div class="report-content">
    <div class="period-selector">
      <button
        v-for="period in periods"
        :key="period.value"
        type="button"
        class="period-chip"
        :class="{ 'period-chip--active': selectedPeriod === period.value }"
        @click="selectedPeriod = period.value"
      >
        {{ period.label }}
      </button>
    </div>

    <div class="total-section">
      <p class="total-section__value" :class="isExpenseTab ? 'text-negative' : 'text-positive'">
        {{ formattedTotal }}
      </p>
      <p class="total-section__label">{{ totalLabel }}</p>
    </div>

    <div class="type-toggle">
      <button
        type="button"
        class="type-toggle__btn"
        :class="{ 'type-toggle__btn--expense': tab === 'Saída' }"
        @click="tab = 'Saída'"
      >
        <q-icon name="north_east" size="16px" />
        Saída
      </button>
      <button
        type="button"
        class="type-toggle__btn"
        :class="{ 'type-toggle__btn--income': tab === 'Entrada' }"
        @click="tab = 'Entrada'"
      >
        <q-icon name="south_west" size="16px" />
        Entrada
      </button>
    </div>

    <div v-if="categoryItems.length === 0" class="empty-state">
      Nenhuma operação neste período
    </div>

    <div v-else class="category-list">
      <div v-for="item in categoryItems" :key="item.category" class="category-item">
        <div class="category-item__header">
          <span class="category-item__name">{{ item.category }}</span>
          <span class="category-item__amount">{{ formatCurrency(item.valueInCents) }}</span>
        </div>
        <div class="category-item__track">
          <div
            class="category-item__bar"
            :class="isExpenseTab ? 'category-item__bar--expense' : 'category-item__bar--income'"
            :style="{ width: `${item.barWidth}%` }"
          />
        </div>
        <p class="category-item__percent">{{ item.percentOfTotal }}% do total</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import { useOperationStore } from 'src/stores/operation-store'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'

type CategoryRow = {
  category: string
  valueInCents: number
}

const ALL_PERIODS = 'Todos'

type PeriodOption = { label: string; value: string }

const operationStore = useOperationStore()

async function buildPeriods(): Promise<PeriodOption[]> {
  const monthGroups = await operationStore.getMonthGroups()
  return [
    { label: 'Todos', value: ALL_PERIODS },
    ...monthGroups.map((month) => ({
      label: dayjs(month.value).format('MMMM YYYY').replace(/^\w/, (c) => c.toUpperCase()),
      value: month.value,
    })),
  ]
}

const periods = ref<PeriodOption[]>(await buildPeriods())
const selectedPeriod = ref(ALL_PERIODS)
const tab = ref<CategoryType>('Saída')
const categories = ref<{ income: CategoryRow[]; expenses: CategoryRow[] }>(
  await loadCategories(selectedPeriod.value),
)

async function loadCategories(period: string) {
  const monthValue = period === ALL_PERIODS ? undefined : period
  return operationStore.getOperationsByCategory(monthValue)
}

async function reloadReport() {
  periods.value = await buildPeriods()
  const nextPeriod = periods.value.some((period) => period.value === selectedPeriod.value)
    ? selectedPeriod.value
    : ALL_PERIODS

  if (nextPeriod !== selectedPeriod.value) {
    selectedPeriod.value = nextPeriod
    return
  }

  categories.value = await loadCategories(selectedPeriod.value)
}

watch(selectedPeriod, async (period) => {
  categories.value = await loadCategories(period)
})

watch(
  () => operationStore.dataRevision,
  () => {
    void reloadReport()
  },
)

const isExpenseTab = computed(() => tab.value === 'Saída')

const activeRows = computed(() => {
  const rows = isExpenseTab.value ? categories.value.expenses : categories.value.income
  return rows.map((row) => ({
    category: row.category,
    valueInCents: Math.abs(Number(row.valueInCents) || 0),
  }))
})

const total = computed(() => activeRows.value.reduce((sum, row) => sum + row.valueInCents, 0))

const maxValue = computed(() =>
  activeRows.value.reduce((max, row) => Math.max(max, row.valueInCents), 0),
)

const categoryItems = computed(() =>
  activeRows.value.map((row) => ({
    ...row,
    percentOfTotal: total.value === 0 ? 0 : Math.round((row.valueInCents / total.value) * 100),
    barWidth: maxValue.value === 0 ? 0 : (row.valueInCents / maxValue.value) * 100,
  })),
)

const formattedTotal = computed(() => BRL(total.value / 100).format())

const totalLabel = computed(() => {
  const kind = isExpenseTab.value ? 'saídas' : 'entradas'
  if (selectedPeriod.value === ALL_PERIODS) {
    return `Total de ${kind} em todo o período`
  }
  const periodLabel = periods.value.find((p) => p.value === selectedPeriod.value)?.label ?? ''
  return `Total de ${kind} em ${periodLabel}`
})

function formatCurrency(valueInCents: number) {
  return BRL(valueInCents / 100).format()
}
</script>

<style lang="scss" scoped>
.report-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.period-selector {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 999px;
  }
}

.period-chip {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  white-space: nowrap;

  &--active {
    background: var(--q-primary);
    color: #fff;
  }
}

.total-section {
  &__value {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
  }

  &__label {
    margin: 4px 0 0;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.45);
  }
}

.type-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  padding: 4px;
  gap: 4px;

  &__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 999px;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 600;
    background: transparent;
    color: rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition:
      background 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;

    &--expense {
      background: #fff;
      color: var(--q-negative);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }

    &--income {
      background: #fff;
      color: var(--q-positive);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
  }
}

.empty-state {
  text-align: center;
  color: rgba(0, 0, 0, 0.45);
  padding: 24px 0;
  font-size: 14px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.category-item {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }

  &__name,
  &__amount {
    font-size: 15px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);
  }

  &__track {
    height: 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.08);
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 999px;
    transition: width 0.25s ease;

    &--expense {
      background: var(--q-negative);
    }

    &--income {
      background: var(--q-positive);
    }
  }

  &__percent {
    margin: 6px 0 0;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
  }
}

:global(body.body--dark) {
  .period-chip {
    color: rgba(255, 255, 255, 0.7);

    &--active {
      color: #fff;
    }
  }

  .total-section__label,
  .empty-state,
  .category-item__percent {
    color: rgba(255, 255, 255, 0.5);
  }

  .type-toggle {
    background: rgba(255, 255, 255, 0.08);

    &__btn {
      color: rgba(255, 255, 255, 0.55);

      &--expense,
      &--income {
        background: rgba(255, 255, 255, 0.12);
      }
    }
  }

  .category-item {
    &__name,
    &__amount {
      color: rgba(255, 255, 255, 0.9);
    }

    &__track {
      background: rgba(255, 255, 255, 0.12);
    }
  }
}
</style>

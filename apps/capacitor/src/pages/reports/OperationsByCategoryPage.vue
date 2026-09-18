<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { useQuasar } from 'quasar'
import { BRL } from '@plumifin/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import HeaderChips, { type HeaderChip } from 'src/components/shell/HeaderChips.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import CategoryOperationsDialog from 'src/components/reports/CategoryOperationsDialog.vue'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { categoryIcon } from 'src/helpers/category-icons'
import { useOperationStore } from 'src/stores/operation-store'

type CategoryRow = { category: string; valueInCents: number }

const ALL_PERIODS = 'Todos'

const EXPENSE_PALETTE = [
  '#b3261e',
  '#d4553f',
  '#e0876a',
  '#c99a8f',
  '#a98f88',
  '#8a7f7b',
  '#6b6c6a',
]
const INCOME_PALETTE = ['#1e7d54', '#3a5a40', '#5f9e73', '#8bc09a', '#a9d1b4']

const $q = useQuasar()
const operationStore = useOperationStore()

async function buildPeriods(): Promise<HeaderChip<string>[]> {
  const monthGroups = await operationStore.getMonthGroups()
  return [
    ...monthGroups.map((month) => {
      const date = dayjs(month.value)
      const isCurrentYear = date.year() === dayjs().year()
      const label = date.format(isCurrentYear ? 'MMM' : 'MMM YYYY').replace('.', '')
      return { label: label.charAt(0).toUpperCase() + label.slice(1), value: month.value }
    }),
    { label: 'Todos', value: ALL_PERIODS },
  ]
}

async function loadCategories(period: string) {
  const monthValue = period === ALL_PERIODS ? undefined : period
  return operationStore.getOperationsByCategory(monthValue)
}

const periods = ref<HeaderChip<string>[]>(await buildPeriods())
const selectedPeriod = computed({
  get: () => operationStore.reportPeriod,
  set: (period) => {
    operationStore.reportPeriod = period ?? ALL_PERIODS
  },
})

// O período persiste entre navegações (operationStore.reportPeriod); se o mês
// selecionado deixou de existir na lista atual, volta para "Todos".
function reconcilePeriod() {
  if (periods.value.some((period) => period.value === selectedPeriod.value)) return false
  selectedPeriod.value = ALL_PERIODS
  return true
}

reconcilePeriod()

const tab = ref<CategoryType>('Saída')
const categories = ref<{ income: CategoryRow[]; expenses: CategoryRow[] }>(
  await loadCategories(selectedPeriod.value),
)

async function reloadReport() {
  periods.value = await buildPeriods()
  if (reconcilePeriod()) return

  categories.value = await loadCategories(selectedPeriod.value)
}

watch(selectedPeriod, async (period) => {
  categories.value = await loadCategories(period ?? ALL_PERIODS)
})

watch(
  () => operationStore.dataRevision,
  () => {
    void reloadReport()
  },
)

const isExpenseTab = computed(() => tab.value === 'Saída')
const palette = computed(() => (isExpenseTab.value ? EXPENSE_PALETTE : INCOME_PALETTE))

const activeRows = computed(() =>
  (isExpenseTab.value ? categories.value.expenses : categories.value.income)
    .map((row) => ({
      category: row.category,
      valueInCents: Math.abs(Number(row.valueInCents) || 0),
    }))
    .filter((row) => row.valueInCents > 0)
    .sort((a, b) => b.valueInCents - a.valueInCents),
)

const total = computed(() => activeRows.value.reduce((sum, row) => sum + row.valueInCents, 0))
const maxValue = computed(() =>
  activeRows.value.reduce((max, row) => Math.max(max, row.valueInCents), 0),
)

const rows = computed(() =>
  activeRows.value.map((row, index) => ({
    ...row,
    icon: categoryIcon(row.category),
    color: palette.value[Math.min(index, palette.value.length - 1)]!,
    share: total.value === 0 ? 0 : (row.valueInCents / total.value) * 100,
    percentLabel:
      total.value === 0 ? '0%' : `${Math.round((row.valueInCents / total.value) * 100)}%`,
    barWidth: maxValue.value === 0 ? 0 : (row.valueInCents / maxValue.value) * 100,
  })),
)

const topRow = computed(() => rows.value[0] ?? null)

const fmt = (cents: number) => BRL(cents / 100).format()

const periodLabel = computed(() => {
  if (!selectedPeriod.value || selectedPeriod.value === ALL_PERIODS) return 'em todo o período'
  return `em ${dayjs(selectedPeriod.value).format('MMMM [de] YYYY')}`
})

const totalCaption = computed(
  () => `${isExpenseTab.value ? 'Saídas' : 'Entradas'} ${periodLabel.value}`,
)

function openCategory(categoryName: string) {
  $q.dialog({
    component: CategoryOperationsDialog,
    componentProps: {
      categoryName,
      type: tab.value,
      month: selectedPeriod.value === ALL_PERIODS ? undefined : selectedPeriod.value,
      periodLabel: `${isExpenseTab.value ? 'Saídas' : 'Entradas'} ${periodLabel.value}`,
    },
  })
}
</script>

<template>
  <q-page class="reports-page">
    <ScreenHeader>
      <template #chips>
        <HeaderChips v-model="selectedPeriod" :options="periods" />
      </template>
      <template #hero>
        <div class="screen-header__caption">{{ totalCaption }}</div>
        <ConcealableValue concealed-class="screen-header__value">
          <div class="screen-header__value">{{ fmt(total) }}</div>
        </ConcealableValue>
      </template>
    </ScreenHeader>

    <ScreenBody>
      <section class="ds-card report-summary">
        <div class="ds-segment">
          <div
            class="ds-segment__item"
            :class="{ 'ds-segment__item--active report-summary__tab--expense': isExpenseTab }"
            @click="tab = 'Saída'"
          >
            <q-icon name="arrow_upward" size="17px" />
            Saídas
          </div>
          <div
            class="ds-segment__item"
            :class="{ 'ds-segment__item--active report-summary__tab--income': !isExpenseTab }"
            @click="tab = 'Entrada'"
          >
            <q-icon name="arrow_downward" size="17px" />
            Entradas
          </div>
        </div>

        <template v-if="rows.length > 0">
          <div class="report-summary__bar" aria-hidden="true">
            <div
              v-for="row in rows"
              :key="row.category"
              class="report-summary__bar-segment"
              :style="{ width: `${row.share}%`, background: row.color }"
            ></div>
          </div>
          <div class="report-summary__foot">
            <span>{{ rows.length }} {{ rows.length === 1 ? 'categoria' : 'categorias' }}</span>
            <span v-if="topRow">
              Maior: <strong>{{ topRow.category }}</strong> · {{ topRow.percentLabel }}
            </span>
          </div>
        </template>
        <div v-else class="ds-empty">Nenhuma operação neste período</div>
      </section>

      <section v-if="rows.length > 0" class="ds-card category-list">
        <div
          v-for="row in rows"
          :key="row.category"
          class="ds-row ds-row--clickable category-row"
          @click="openCategory(row.category)"
        >
          <div
            class="ds-avatar"
            :class="isExpenseTab ? 'ds-avatar--expense' : 'ds-avatar--income'"
            :style="{ color: row.color }"
          >
            <q-icon :name="row.icon" size="20px" />
          </div>
          <div class="ds-row__body category-row__body">
            <div class="category-row__head">
              <div class="ds-row__title">{{ row.category }}</div>
              <ConcealableValue concealed-class="ds-row__value">
                <div class="ds-row__value">{{ fmt(row.valueInCents) }}</div>
              </ConcealableValue>
            </div>
            <div class="category-row__track-wrap">
              <div class="category-row__track">
                <div
                  class="category-row__bar"
                  :style="{ width: `${row.barWidth}%`, background: row.color }"
                ></div>
              </div>
              <div class="category-row__percent">{{ row.percentLabel }}</div>
            </div>
          </div>
          <q-icon name="chevron_right" size="20px" class="ds-chevron" />
        </div>
      </section>
    </ScreenBody>
  </q-page>
</template>

<style lang="scss" scoped>
.reports-page {
  background: var(--ds-surface);
}

.report-summary {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.report-summary__tab--expense {
  color: var(--ds-expense);
}

.report-summary__tab--income {
  color: var(--ds-income);
}

.report-summary__bar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  gap: 2px;
}

.report-summary__bar-segment {
  border-radius: 5px;
  min-width: 2px;
}

.report-summary__foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--ds-muted);

  strong {
    color: var(--ds-ink);
  }
}

.category-list {
  overflow: hidden;
}

.category-row {
  padding: 12px 16px;
}

.category-row__body {
  gap: 6px;
}

.category-row__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}

.category-row__track-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-row__track {
  flex: 1;
  height: 6px;
  background: #eef1f0;
  border-radius: 3px;
  overflow: hidden;
}

.category-row__bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.25s ease;
}

.category-row__percent {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--ds-faint);
  min-width: 30px;
  text-align: right;
}
</style>

<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { BRL, getWeekdayName } from '@plumifin/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import HeaderChips from 'src/components/shell/HeaderChips.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import EmptyList from 'src/components/EmptyList.vue'
import OperationListItem from 'src/components/operation/OperationListItem.vue'
import OperationDetailsDialog, {
  type OperationDetailsAction,
} from 'src/components/operation/OperationDetailsDialog.vue'
import type { Operation } from 'src/databases/entities/expenses'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { isVirtualInvoiceLine } from 'src/models/virtual-invoice-line'
import { categoryIcon } from 'src/helpers/category-icons'
import { useOperationStore } from 'src/stores/operation-store'
import { useCenterStore } from 'src/stores/center-store'
import { useConfigStore } from 'src/stores/config-store'

const $q = useQuasar()
const router = useRouter()
const operationStore = useOperationStore()
const centerStore = useCenterStore()
const configStore = useConfigStore()

const fmt = (cents: number) => BRL(cents / 100).format()

const monthChips = computed(() =>
  operationStore.months.map((month) => {
    const date = dayjs(month.value)
    const isCurrentYear = date.year() === dayjs().year()
    const label = date.format(isCurrentYear ? 'MMM' : 'MMM YYYY').replace('.', '')
    return { value: month.value, label: label.charAt(0).toUpperCase() + label.slice(1) }
  }),
)

const selectedMonthName = computed(() =>
  operationStore.month ? dayjs(operationStore.month).format('MMMM') : '',
)

const isCurrentOrPastMonth = computed(() =>
  operationStore.month ? operationStore.month <= dayjs().format('YYYY-MM') : true,
)

const heroCaption = computed(() => {
  if (!operationStore.month) return 'Resultado do mês'
  const isCurrentMonth = operationStore.month === dayjs().format('YYYY-MM')
  if (isCurrentMonth) return `Resultado de ${selectedMonthName.value} até hoje`
  return isCurrentOrPastMonth.value
    ? `Resultado de ${selectedMonthName.value}`
    : `Previsto para ${selectedMonthName.value}`
})

/** Resultado do mês = saldo realizado até o corte − saldo anterior ao mês. */
const monthResultInCents = computed(() => {
  const summary = operationStore.selectedMonthSummary
  return summary.realizedBalance - summary.initialBalance
})

const monthResultText = computed(() => {
  const value = monthResultInCents.value
  return `${value > 0 ? '+' : ''}${fmt(value)}`
})

const scheduledInvoiceTotalInCents = computed(
  () => operationStore.selectedMonthSummary.scheduledInvoiceTotalInCents,
)
const scheduledFutureOperationsTotalInCents = computed(
  () => operationStore.selectedMonthSummary.scheduledFutureOperationsTotalInCents,
)
const scheduledTotalInCents = computed(
  () => scheduledInvoiceTotalInCents.value + scheduledFutureOperationsTotalInCents.value,
)
const hasScheduledAmounts = computed(() => scheduledTotalInCents.value !== 0)

const showScheduledDetails = ref(false)

function isDayDetailsShown(day: string) {
  return configStore.showOperationDetailsByDay[day] ?? configStore.showOperationDetails
}

function dayLabel(day: string) {
  return dayjs(day).format('D [de] MMMM')
}

function weekdayLabel(day: string) {
  return getWeekdayName(dayjs(day).day())
}

function recurrenceMeta(operation: Operation) {
  const rule = operation.recurringRule
  if (!rule) return null
  if (rule.frequency === FrequencyType.WEEKLY && rule.weeklyAnchorDay != null) {
    return `Repete toda ${getWeekdayName(rule.weeklyAnchorDay)}`
  }
  if (rule.frequency === FrequencyType.MONTHLY) {
    return `Repete todo dia ${rule.anchorDay}`
  }
  return 'Recorrente'
}

function operationMeta(operation: Operation) {
  const parts = [operation.category.name]
  const recurrence = recurrenceMeta(operation)
  if (recurrence) parts.push(recurrence)
  return parts.join(' · ')
}

async function transferOperationToAnotherCenter(operation: Operation) {
  const pick = await centerStore.selectCenter(
    (center) => center.id === operation.center?.id || !center.isActive,
    { allowNone: operation.center != null },
  )
  if (pick) {
    await operationStore.transferOperationToCenter(operation, pick.center)
  }
}

function openOperationDetails(operation: Operation) {
  $q.dialog({
    component: OperationDetailsDialog,
    componentProps: { operation },
  }).onOk((action: OperationDetailsAction) => {
    if (action === 'edit') {
      operationStore.editOperation(operation)
    } else if (action === 'duplicate') {
      operationStore.copyOperation(operation)
    } else if (action === 'move') {
      void transferOperationToAnotherCenter(operation)
    } else if (action === 'delete') {
      operationStore.removeOperation(operation)
    }
  })
}

function goToInvoices() {
  void router.push({ name: 'invoices' })
}

function goToInvoicesForCard(cardId: number) {
  void router.push({ name: 'invoices', query: { cardId } })
}
</script>

<template>
  <q-page class="operations-page">
    <ScreenHeader>
      <template v-if="monthChips.length > 0" #chips>
        <HeaderChips v-model="operationStore.month" :options="monthChips" />
      </template>
      <template #hero>
        <div class="screen-header__caption">{{ heroCaption }}</div>
        <ConcealableValue concealed-class="screen-header__value">
          <div
            v-if="operationStore.hasLoadedSelectedMonthSummary"
            class="screen-header__value"
            :class="{ 'screen-header__value--negative': monthResultInCents < 0 }"
          >
            {{ monthResultText }}
          </div>
          <div v-else class="screen-header__value">—</div>
        </ConcealableValue>
      </template>
    </ScreenHeader>

    <ScreenBody>
      <template v-if="operationStore.hasLoadedSelectedMonthSummary">
        <section class="ds-card month-summary">
          <div class="month-summary__row">
            <span class="month-summary__label">
              <q-icon name="history" size="19px" />
              Saldo anterior
            </span>
            <ConcealableValue concealed-class="month-summary__value">
              <span class="month-summary__value">
                {{ fmt(operationStore.selectedMonthSummary.initialBalance) }}
              </span>
            </ConcealableValue>
          </div>

          <template v-if="hasScheduledAmounts">
            <div
              class="month-summary__row month-summary__row--clickable"
              @click="showScheduledDetails = !showScheduledDetails"
            >
              <span class="month-summary__label">
                <q-icon name="event" size="19px" />
                Agendado até o fim do mês
              </span>
              <span class="month-summary__value-wrap">
                <ConcealableValue concealed-class="month-summary__value">
                  <span
                    class="month-summary__value"
                    :class="
                      scheduledTotalInCents < 0
                        ? 'month-summary__value--expense'
                        : 'month-summary__value--income'
                    "
                  >
                    {{ fmt(scheduledTotalInCents) }}
                  </span>
                </ConcealableValue>
                <q-icon
                  :name="showScheduledDetails ? 'expand_less' : 'expand_more'"
                  size="18px"
                  class="month-summary__caret"
                />
              </span>
            </div>

            <div v-if="showScheduledDetails" class="month-summary__details">
              <div
                v-if="scheduledInvoiceTotalInCents !== 0"
                class="month-summary__detail month-summary__detail--link"
                @click="goToInvoices"
              >
                <span>Fatura do cartão <q-icon name="chevron_right" size="16px" /></span>
                <ConcealableValue>
                  <span class="month-summary__detail-value">
                    {{ fmt(scheduledInvoiceTotalInCents) }}
                  </span>
                </ConcealableValue>
              </div>
              <div v-if="scheduledFutureOperationsTotalInCents !== 0" class="month-summary__detail">
                <span>{{
                  scheduledFutureOperationsTotalInCents < 0
                    ? 'Saídas previstas'
                    : 'Entradas previstas'
                }}</span>
                <ConcealableValue>
                  <span class="month-summary__detail-value">
                    {{ fmt(scheduledFutureOperationsTotalInCents) }}
                  </span>
                </ConcealableValue>
              </div>
            </div>
          </template>
        </section>

        <section
          v-for="[day, summary] in Object.entries(operationStore.monthOperationsSummary.summaries)"
          :key="day"
          class="day-group"
        >
          <div
            class="day-group__header"
            @click="configStore.toggleOperationDetailsVisibilityForDay(day)"
          >
            <div class="day-group__date">
              <span class="day-group__day">{{ dayLabel(day) }}</span>
              <span class="day-group__weekday">{{ weekdayLabel(day) }}</span>
            </div>
            <div class="day-group__summary">
              <template v-if="isDayDetailsShown(day)">
                <span>Balanço</span>
                <ConcealableValue concealed-class="day-group__summary-value">
                  <span
                    class="day-group__summary-value"
                    :class="
                      summary.dayBalance < 0
                        ? 'day-group__summary-value--expense'
                        : 'day-group__summary-value--income'
                    "
                  >
                    {{ summary.dayBalance > 0 ? '+' : '' }}{{ fmt(summary.dayBalance) }}
                  </span>
                </ConcealableValue>
              </template>
              <template v-else>
                <span>Saldo</span>
                <ConcealableValue concealed-class="day-group__summary-value">
                  <span class="day-group__summary-value">{{ fmt(summary.balance) }}</span>
                </ConcealableValue>
              </template>
              <q-icon
                :name="isDayDetailsShown(day) ? 'expand_less' : 'expand_more'"
                size="18px"
                class="day-group__caret"
              />
            </div>
          </div>

          <div
            v-if="isDayDetailsShown(day) && summary.operations"
            class="ds-card ds-card--flat day-group__card"
          >
            <template v-for="operation in summary.operations" :key="operation.id">
              <OperationListItem
                v-if="isVirtualInvoiceLine(operation)"
                icon="credit_card"
                :title="`Fatura ${operation.cardName}`"
                meta="Cartão · Previsto"
                :value-in-cents="operation.valueInCents"
                @click="goToInvoicesForCard(operation.cardId)"
              />
              <OperationListItem
                v-else
                :icon="categoryIcon(operation.category.name)"
                :title="operation.description || 'Não identificada'"
                :meta="operationMeta(operation)"
                :value-in-cents="operation.valueInCents"
                @click="openOperationDetails(operation)"
              />
            </template>
            <div class="day-group__footer">
              Saldo após o dia
              <ConcealableValue concealed-class="day-group__footer-value">
                <span class="day-group__footer-value">{{ fmt(summary.balance) }}</span>
              </ConcealableValue>
            </div>
          </div>
        </section>
      </template>

      <div
        v-if="operationStore.hasLoadedFirstTime && !operationStore.month"
        class="ds-card operations-empty"
      >
        <EmptyList label="Nenhuma operação lançada" />
      </div>
    </ScreenBody>
  </q-page>
</template>

<style lang="scss" scoped>
.operations-page {
  background: var(--ds-surface);
}

.month-summary {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.month-summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13.5px;
  color: var(--ds-ink);
}

.month-summary__row--clickable {
  cursor: pointer;
}

.month-summary__label {
  display: flex;
  align-items: center;
  gap: 8px;

  .q-icon {
    color: var(--ds-muted);
  }
}

.month-summary__value-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.month-summary__value {
  font-weight: 700;
}

.month-summary__value--expense {
  color: var(--ds-expense);
}

.month-summary__value--income {
  color: var(--ds-income);
}

.month-summary__caret {
  color: var(--ds-muted);
}

.month-summary__details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 2px 27px;
  font-size: 13px;
  color: var(--ds-muted);
}

.month-summary__detail {
  display: flex;
  justify-content: space-between;

  > span:first-child {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.month-summary__detail--link {
  cursor: pointer;
}

.month-summary__detail-value {
  font-weight: 500;
  color: var(--ds-ink);
}

.day-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 8px;
  cursor: pointer;
  user-select: none;
}

.day-group__date {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.day-group__day {
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-ink);
}

.day-group__weekday {
  font-size: 12px;
  color: var(--ds-faint);
}

.day-group__summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--ds-muted);
}

.day-group__summary-value {
  font-weight: 700;
  color: var(--ds-ink);
}

.day-group__summary-value--expense {
  color: var(--ds-expense);
}

.day-group__summary-value--income {
  color: var(--ds-income);
}

.day-group__caret {
  color: var(--ds-faint);
}

.day-group__card {
  border-radius: 16px;
  overflow: hidden;
}

.day-group__footer {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding: 8px 14px;
  background: #f6f8f7;
  font-size: 12px;
  color: var(--ds-muted);
}

.day-group__footer-value {
  font-weight: 700;
  color: var(--ds-ink);
}

.operations-empty {
  padding: 24px 16px;
}
</style>

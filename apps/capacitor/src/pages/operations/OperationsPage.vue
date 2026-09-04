<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, ref } from 'vue'
import { StatusBar } from '@capacitor/status-bar'
import { getCssVar, useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { BRL, getWeekdayName } from '@ngsfer-myexpenses/utils'

import { useOperationStore } from 'src/stores/operation-store'
import { useCenterStore } from 'src/stores/center-store'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import EmptyList from 'src/components/EmptyList.vue'
import OperationDetailsDialog, {
  type OperationDetailsAction,
} from 'src/components/operation/OperationDetailsDialog.vue'
import type { Operation } from 'src/databases/entities/expenses'
import { useConfigStore } from 'src/stores/config-store'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { isVirtualInvoiceLine } from 'src/models/virtual-invoice-line'

const qPrimaryColor = getCssVar('primary')
if (qPrimaryColor) {
  void StatusBar.setBackgroundColor({ color: qPrimaryColor })
}

const $q = useQuasar()
const router = useRouter()
const operationStore = useOperationStore()
const centerStore = useCenterStore()
const configStore = useConfigStore()

function isDayDetailsShown(day: string) {
  return configStore.showOperationDetailsByDay[day] ?? configStore.showOperationDetails
}

async function transferOperationToAnotherCenter(operation: Operation) {
  const targetCenter = await centerStore.selectCenter(
    (center) => center.id === operationStore.center?.id || !center.isActive,
  )
  if (targetCenter) {
    await operationStore.transferOperationToCenter(operation, targetCenter)
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

const totalForMonth = computed(() =>
  operationStore.month
    ? BRL(operationStore.selectedMonthSummary.realizedBalance / 100).format()
    : 0,
)

const scheduledInvoiceTotalInCents = computed(
  () => operationStore.selectedMonthSummary.scheduledInvoiceTotalInCents,
)
const scheduledFutureOperationsTotalInCents = computed(
  () => operationStore.selectedMonthSummary.scheduledFutureOperationsTotalInCents,
)
const scheduledTotalInCents = computed(
  () => scheduledInvoiceTotalInCents.value + scheduledFutureOperationsTotalInCents.value,
)

const hasScheduledAmounts = computed(
  () => operationStore.hasLoadedSelectedMonthSummary && scheduledTotalInCents.value !== 0,
)

const scheduledTotalForMonth = computed(() => BRL(scheduledTotalInCents.value / 100).format())
const scheduledInvoiceTotalForMonth = computed(() =>
  BRL(scheduledInvoiceTotalInCents.value / 100).format(),
)
const scheduledFutureOperationsTotalForMonth = computed(() =>
  BRL(scheduledFutureOperationsTotalInCents.value / 100).format(),
)

const showScheduledDetails = ref(false)

function toggleScheduledDetails() {
  showScheduledDetails.value = !showScheduledDetails.value
}

function goToInvoices() {
  void router.push({ name: 'invoices' })
}

function goToInvoicesForCard(cardId: number) {
  void router.push({ name: 'invoices', query: { cardId } })
}
</script>

<template>
  <q-page>
    <q-tabs v-model="operationStore.month" indicator-color="primary" class="tabs-container">
      <q-tab
        v-for="month in operationStore.months"
        :key="month.value"
        :name="month.value"
        :label="month.label.charAt(0).toUpperCase() + month.label.slice(1)"
        no-caps
      />
    </q-tabs>
    <div v-if="operationStore.hasLoadedSelectedMonthSummary" class="column q-mx-md q-my-lg">
      <div class="row items-center">
        <ConcealableValue concealed-class="text-h4 q-ma-none">
          <p
            class="text-h4 q-ma-none text-weight-medium"
            :class="{
              'text-negative': operationStore.selectedMonthSummary.realizedBalance < 0,
            }"
          >
            {{ totalForMonth }}
          </p>
        </ConcealableValue>
      </div>
      <p class="text-subtitle1 q-ma-none">Até hoje</p>
      <div
        v-if="hasScheduledAmounts"
        class="row items-center q-mt-xs cursor-pointer"
        @click="toggleScheduledDetails"
      >
        <p class="text-body2 text-grey-8 q-ma-none">
          Valores agendados:
          <span class="text-weight-medium">{{ scheduledTotalForMonth }}</span>
        </p>
        <q-icon
          :name="showScheduledDetails ? 'expand_less' : 'expand_more'"
          size="18px"
          color="grey-8"
          class="q-ml-xs"
        />
      </div>
      <div v-if="hasScheduledAmounts && showScheduledDetails" class="column q-mt-xs q-pl-sm">
        <div
          v-if="scheduledInvoiceTotalInCents !== 0"
          class="row items-center cursor-pointer"
          @click="goToInvoices"
        >
          <p class="text-body2 text-grey-8 q-ma-none">
            Fatura de cartão:
            <span class="text-weight-medium">{{ scheduledInvoiceTotalForMonth }}</span>
          </p>
          <q-icon name="chevron_right" size="18px" color="grey-8" class="q-ml-xs" />
        </div>
        <p
          v-if="scheduledFutureOperationsTotalInCents !== 0"
          class="text-body2 text-grey-8 q-ma-none"
        >
          Saídas previstas:
          <span class="text-weight-medium">{{ scheduledFutureOperationsTotalForMonth }}</span>
        </p>
      </div>
    </div>
    <q-list v-if="operationStore.hasLoadedSelectedMonthSummary" class="operations-list">
      <template
        v-for="[day, summary] in Object.entries(operationStore.monthOperationsSummary.summaries)"
        :key="day"
      >
        <q-item class="daily-header">
          <q-item-section class="bg-grey-2 q-pa-sm rounded-borders">
            <q-item-label class="text-body2 text-grey-8 row items-center justify-between">
              <span>{{ dayjs(day).format('D [de] MMMM, ddd[.]') }}</span>
              <div class="row items-center no-wrap">
                <span
                  v-if="summary.operations && isDayDetailsShown(day)"
                  class="text-caption row items-center"
                >
                  <span>Balanço do dia:</span>
                  <ConcealableValue>
                    <span
                      class="q-ml-xs text-weight-bold"
                      :class="{
                        'text-positive': summary.dayBalance > 0,
                        'text-negative': summary.dayBalance < 0,
                      }"
                    >
                      {{ summary.dayBalance > 0 ? '+' : ''
                      }}{{ BRL(summary.dayBalance / 100).format() }}
                    </span>
                  </ConcealableValue>
                </span>
                <span
                  v-if="summary.operations && !isDayDetailsShown(day)"
                  class="text-caption row items-center"
                >
                  <span>Saldo:</span>
                  <ConcealableValue>
                    <span class="q-ml-xs text-weight-bold">
                      {{ BRL(summary.balance / 100).format() }}
                    </span>
                  </ConcealableValue>
                </span>
                <q-btn
                  v-if="summary.operations"
                  :icon="isDayDetailsShown(day) ? 'expand_less' : 'expand_more'"
                  flat
                  round
                  dense
                  @click="configStore.toggleOperationDetailsVisibilityForDay(day)"
                  class="q-ml-xs"
                >
                  <q-tooltip>
                    {{
                      isDayDetailsShown(day)
                        ? 'Ocultar detalhamento deste dia'
                        : 'Mostrar detalhamento deste dia'
                    }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-item-label>
            <q-item-label
              v-if="summary.operations && isDayDetailsShown(day)"
              class="text-caption text-grey-8 row justify-end q-mt-xs"
            >
              <span>Saldo:</span>
              <ConcealableValue>
                <span class="q-ml-xs text-weight-bold">
                  {{ BRL(summary.balance / 100).format() }}
                </span>
              </ConcealableValue>
            </q-item-label>
          </q-item-section>
        </q-item>
        <template v-for="operation in summary.operations" :key="operation.id">
          <q-item
            v-if="isVirtualInvoiceLine(operation)"
            clickable
            v-ripple
            @click="goToInvoicesForCard(operation.cardId)"
          >
            <q-item-section avatar>
              <q-icon name="credit_card" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Previsto</q-item-label>
              <q-item-label class="text-body1">Fatura {{ operation.cardName }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <ConcealableValue>
                <span
                  class="text-body2"
                  :class="operation.valueInCents < 0 ? 'text-black' : 'text-positive'"
                >
                  {{ operation.valueInCents >= 0 ? '+' : ''
                  }}{{ BRL(operation.valueInCents / 100).format() }}
                </span>
              </ConcealableValue>
            </q-item-section>
          </q-item>
          <q-item v-else clickable v-ripple @click="openOperationDetails(operation)">
            <q-item-section>
              <q-item-label class="text-body1">
                <span v-if="operation.description">{{ operation.description }}</span>
                <span v-else>Não identificada</span>
              </q-item-label>
              <q-item-label caption>{{ operation.category.name }}</q-item-label>
              <q-item-label v-if="operation.recurringRule" caption>
                <q-icon name="repeat" />
                Repete
                <template v-if="operation.recurringRule?.frequency === FrequencyType.WEEKLY">
                  toda(o) {{ getWeekdayName(operation.recurringRule.weeklyAnchorDay!) }}
                </template>
                <template v-if="operation.recurringRule?.frequency === FrequencyType.MONTHLY">
                  todo dia {{ operation.recurringRule.anchorDay }}
                </template>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <ConcealableValue>
                <span
                  class="text-body2"
                  :class="operation.isExpense ? 'text-black' : 'text-positive'"
                >
                  {{ operation.isExpense ? '' : '+' }}{{ operation.valueString }}
                </span>
              </ConcealableValue>
            </q-item-section>
          </q-item>
        </template>
      </template>
      <q-item>
        <q-item-section>
          <q-item-label class="text-weight-bold">Saldo anterior</q-item-label>
        </q-item-section>
        <q-item-section side>
          <ConcealableValue>
            <span>{{
              BRL(operationStore.selectedMonthSummary.initialBalance / 100).format()
            }}</span>
          </ConcealableValue>
        </q-item-section>
      </q-item>
    </q-list>
    <div v-if="operationStore.hasLoadedFirstTime && !operationStore.month" class="q-mt-xl">
      <EmptyList label="Nenhuma operação lançada" />
    </div>
  </q-page>
</template>

<style lang="scss" scoped>
.operations-list {
  padding-bottom: 82px;
}

.tabs-container {
  border-bottom: 1px solid $blue-grey-3;
}

.daily-header:not(.daily-header:first-child) {
  margin-top: map-get($space-md, y);
}
</style>

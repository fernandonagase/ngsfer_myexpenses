<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { StatusBar } from '@capacitor/status-bar'
import { getCssVar } from 'quasar'
import { BRL } from "@ngsfer-myexpenses/utils"

import { useOperationStore } from 'src/stores/operation-store'
import { useCenterStore } from 'src/stores/center-store'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import EmptyList from 'src/components/EmptyList.vue'
import type { Operation } from 'src/databases/entities/expenses'
import { useConfigStore } from 'src/stores/config-store'

const qPrimaryColor = getCssVar('primary')
if (qPrimaryColor) {
  void StatusBar.setBackgroundColor({ color: qPrimaryColor })
}

const operationStore = useOperationStore()
const centerStore = useCenterStore()
const configStore = useConfigStore()

async function transferOperationToAnotherCenter(operation: Operation) {
  const targetCenter = await centerStore.selectCenter(
    (center) => center.id === operationStore.center?.id || !center.isActive,
  )
  if (targetCenter) {
    await operationStore.transferOperationToCenter(operation, targetCenter)
  }
}

const totalForMonth = computed(() =>
  operationStore.month ? BRL(operationStore.selectedMonthSummary.finalBalance / 100).format() : 0,
)
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
              'text-negative': operationStore.selectedMonthSummary.finalBalance < 0,
            }"
          >
            {{ totalForMonth }}
          </p>
        </ConcealableValue>
      </div>
      <p class="text-subtitle1 q-ma-none">Até o fim do mês</p>
    </div>
    <q-list v-if="operationStore.hasLoadedSelectedMonthSummary" class="operations-list">
      <template
        v-for="[day, summary] in Object.entries(operationStore.monthOperationsSummary.summaries)"
        :key="day"
      >
        <q-item class="daily-header">
          <q-item-section class="bg-grey-2 q-pa-sm rounded-borders">
            <q-item-label class="text-body2 text-grey-8 row justify-between">
              <span>{{ dayjs(day).format('D [de] MMMM, ddd[.]') }}</span>
              <span
                v-if="summary.operations && configStore.showOperationDetails"
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
                v-if="summary.operations && !configStore.showOperationDetails"
                class="text-caption row items-center"
              >
                <span>Saldo:</span>
                <ConcealableValue>
                  <span class="q-ml-xs text-weight-bold">
                    {{ BRL(summary.balance / 100).format() }}
                  </span>
                </ConcealableValue>
              </span>
            </q-item-label>
            <q-item-label
              v-if="summary.operations && configStore.showOperationDetails"
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
        <q-item v-for="operation in summary.operations" :key="operation.id" clickable v-ripple>
          <q-item-section>
            <q-item-label class="text-body1">
              <span v-if="operation.description">{{ operation.description }}</span>
              <span v-else>Não identificada</span>
            </q-item-label>
            <q-item-label caption>{{ operation.category.name }}</q-item-label>
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
          <q-popup-proxy>
            <q-list style="min-width: 100px" class="bg-white">
              <q-item clickable v-close-popup @click="operationStore.editOperation(operation)">
                <q-item-section>Alterar</q-item-section>
                <q-item-section side>
                  <q-icon name="edit" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="operationStore.copyOperation(operation)">
                <q-item-section>Duplicar</q-item-section>
                <q-item-section side>
                  <q-icon name="content_copy" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="transferOperationToAnotherCenter(operation)">
                <q-item-section>Mover</q-item-section>
                <q-item-section side>
                  <q-icon name="move_up" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="operationStore.removeOperation(operation)">
                <q-item-section>Excluir</q-item-section>
                <q-item-section side>
                  <q-icon name="delete" size="xs" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-popup-proxy>
        </q-item>
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
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="primary" @click="operationStore.addOperation()" />
    </q-page-sticky>
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

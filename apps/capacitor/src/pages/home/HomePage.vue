<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import { useHomeStore } from 'src/stores/home-store'
import { useOperationStore } from 'src/stores/operation-store'
import ConcealableValue from 'src/components/ConcealableValue.vue'

const router = useRouter()
const homeStore = useHomeStore()
const operationStore = useOperationStore()

const balanceForDisplay = computed(() =>
  homeStore.summary ? BRL(homeStore.summary.balanceInCents / 100).format() : '',
)
const scheduledOutflowsForDisplay = computed(() =>
  homeStore.summary ? BRL(homeStore.summary.scheduledOutflowsInCents / 100).format() : '',
)
const scheduledInflowsForDisplay = computed(() =>
  homeStore.summary ? BRL(homeStore.summary.scheduledInflowsInCents / 100).format() : '',
)

function goToOperations() {
  const currentMonth = dayjs().format('YYYY-MM')
  if (operationStore.months.some((month) => month.value === currentMonth)) {
    operationStore.month = currentMonth
  }
  void router.push({ name: 'operations' })
}
</script>

<template>
  <q-page class="q-pa-md">
    <template v-if="homeStore.error">
      <div class="column items-center q-mt-xl">
        <q-icon name="error_outline" color="negative" size="32px" />
        <p class="text-body1 text-negative q-mt-sm">{{ homeStore.error }}</p>
      </div>
    </template>
    <template v-else-if="!homeStore.hasLoaded">
      <div class="column items-center q-mt-xl">
        <q-spinner color="primary" size="32px" />
      </div>
    </template>
    <template v-else-if="homeStore.summary">
      <div class="column q-my-lg">
        <p class="text-subtitle1 q-ma-none">Saldo atual</p>
        <ConcealableValue concealed-class="text-h4 q-ma-none">
          <p
            class="text-h4 q-ma-none text-weight-medium"
            :class="{ 'text-negative': homeStore.summary.balanceInCents < 0 }"
          >
            {{ balanceForDisplay }}
          </p>
        </ConcealableValue>
      </div>
      <div class="row q-col-gutter-md">
        <div class="col-6">
          <div class="column cursor-pointer" @click="goToOperations">
            <p class="text-subtitle2 text-grey-8 q-ma-none">Saídas agendadas</p>
            <ConcealableValue concealed-class="text-h6 q-ma-none">
              <p class="text-h6 q-ma-none text-weight-medium">
                {{ scheduledOutflowsForDisplay }}
              </p>
            </ConcealableValue>
          </div>
        </div>
        <div class="col-6">
          <div class="column cursor-pointer" @click="goToOperations">
            <p class="text-subtitle2 text-grey-8 q-ma-none">Entradas agendadas</p>
            <ConcealableValue concealed-class="text-h6 q-ma-none">
              <p class="text-h6 q-ma-none text-weight-medium">
                {{ scheduledInflowsForDisplay }}
              </p>
            </ConcealableValue>
          </div>
        </div>
      </div>
      <q-btn
        outline
        no-caps
        label="Ver lançamentos"
        icon="list_alt"
        color="primary"
        class="full-width q-mt-md"
        @click="goToOperations"
      />
    </template>
  </q-page>
</template>

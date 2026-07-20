<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'
import { useQuasar } from 'quasar'

import type { Category, CreditCard } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { useCategoryStore } from 'src/stores/category-store'
import { useCardStore } from 'src/stores/card-store'
import { type RecurrenceType, recurrenceTypeOptions } from './recurrence-types'
import { recurrenceFrequencyOptions } from './recurrence-frequencies'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { notificationService } from 'src/services/notification-service'

const $q = useQuasar()

const value = defineModel<string>('value')
const installmentCount = defineModel<number>('installmentCount')
const date = defineModel<string>('date')
const category = defineModel<Category | null>('category')
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })
const recurrenceType = defineModel<RecurrenceType>('recurrenceType', { default: 'one-time' })
const recurrenceFrequency = defineModel<FrequencyType | undefined>('recurrenceFrequency')
const notes = defineModel<string | undefined>('notes')
const notificationEnabled = defineModel<boolean>('notificationEnabled', { default: false })
const notificationDaysBefore = defineModel<number | undefined>('notificationDaysBefore')
const notificationTime = defineModel<string | undefined>('notificationTime')
const paymentMethod = defineModel<'cash' | 'credit'>('paymentMethod', { default: 'cash' })
const creditCard = defineModel<CreditCard | null>('creditCard', { default: null })

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}
const valueRules = [(val: string) => BRL(val).value !== 0 || 'Informe um valor diferente de 0']
const dateRules = [(val: string) => !!val || 'Informe a data da operação']
const categoryRules = [(val: string) => !!val || 'Informe a categoria da operação']

const categoryStore = useCategoryStore()
const cardStore = useCardStore()

const filteredCategories = computed<Array<Category>>(() =>
  operationType.value === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput,
)

const hasInstallments = computed(() => recurrenceType.value === 'installments')
const isRecurring = computed(() => recurrenceType.value === 'recurring')
const isCredit = computed(() => paymentMethod.value === 'credit')
const canUseCredit = computed(() => operationType.value === 'Saída' && !isRecurring.value)
const creditCardRules = [
  (val: CreditCard | null) => !isCredit.value || !!val || 'Selecione o cartão de crédito',
]

onMounted(async () => {
  await cardStore.fetchCards()
})

const isFutureDate = computed(() => {
  if (!date.value) return false
  return dayjs(date.value).isAfter(dayjs(), 'day')
})

const notificationDaysBeforeOptions = [
  { label: 'No mesmo dia', value: 0 },
  { label: '1 dia antes', value: 1 },
  { label: '2 dias antes', value: 2 },
]

watch(
  [operationType, filteredCategories],
  () => {
    if (category.value?.type !== operationType.value) {
      category.value = filteredCategories.value[0] ?? null
    }
  },
  {
    immediate: true,
  },
)

watch(recurrenceType, () => {
  if (recurrenceType.value === 'recurring' && !recurrenceFrequency.value) {
    recurrenceFrequency.value = FrequencyType.MONTHLY
  }
})

watch([operationType, recurrenceType], () => {
  if (!canUseCredit.value) {
    paymentMethod.value = 'cash'
    creditCard.value = null
  }
})

watch(paymentMethod, (method) => {
  if (method !== 'credit') {
    creditCard.value = null
    return
  }
  if (cardStore.activeCards.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Cadastre um cartão em Configurações antes de lançar no crédito.',
    })
    paymentMethod.value = 'cash'
    return
  }
  if (!creditCard.value && cardStore.activeCards.length === 1) {
    creditCard.value = cardStore.activeCards[0] ?? null
  }
})

watch(isFutureDate, (isFuture) => {
  if (!isFuture) {
    notificationEnabled.value = false
    notificationDaysBefore.value = undefined
    notificationTime.value = undefined
  }
})

async function onNotificationToggle(val: boolean) {
  if (!val) return

  const granted = await notificationService.checkAndRequestPermissions()
  if (!granted) {
    notificationEnabled.value = false
    $q.notify({
      type: 'warning',
      message: 'Permissão de notificações negada. Ative nas configurações do dispositivo.',
    })
  }
}
</script>

<template>
  <div>
    <q-btn-toggle
      v-model="operationType"
      spread
      no-caps
      unelevated
      toggle-color="primary"
      :options="[
        { label: 'Despesa', value: 'Saída' },
        { label: 'Receita', value: 'Entrada' },
      ]"
      class="q-mb-md"
    />
    <template v-if="canUseCredit">
      <q-btn-toggle
        v-model="paymentMethod"
        spread
        no-caps
        unelevated
        toggle-color="secondary"
        :options="[
          { label: 'Dinheiro', value: 'cash' },
          { label: 'Crédito', value: 'credit' },
        ]"
        class="q-mb-md"
      />
      <q-select
        v-if="isCredit"
        v-model="creditCard"
        :options="cardStore.activeCards"
        label="Cartão"
        option-label="name"
        :rules="creditCardRules"
        outlined
        class="q-mb-md"
      />
    </template>
    <q-field v-model="value" label="Valor" :rules="valueRules" lazy-rules outlined>
      <template v-slot:control="{ id, floatingLabel, modelValue, emitValue }">
        <input
          :id="id"
          class="q-field__input"
          :value="modelValue"
          inputmode="decimal"
          @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
          v-money3="moneyFormatForDirective"
          v-show="floatingLabel"
        />
      </template>
    </q-field>
    <q-option-group
      v-model="recurrenceType"
      color="secondary"
      :options="recurrenceTypeOptions"
      inline
      class="q-mb-md"
    />
    <template v-if="hasInstallments">
      <q-input
        v-model.number="installmentCount"
        type="number"
        label="Número de parcelas"
        outlined
        class="q-mb-md"
        suffix="x"
      />
    </template>
    <template v-if="isRecurring">
      <q-btn-toggle
        v-model="recurrenceFrequency"
        toggle-color="primary"
        :options="recurrenceFrequencyOptions"
        no-caps
        unelevated
        class="q-mb-md"
      />
    </template>
    <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter outlined />
    <q-input v-model="date" type="date" label="Data" :rules="dateRules" lazy-rules outlined />
    <q-select
      v-model="category"
      :options="filteredCategories"
      label="Categoria"
      option-label="name"
      :rules="categoryRules"
      outlined
    />
    <q-input v-model="notes" type="text" label="Observações" outlined autogrow />
    <template v-if="isFutureDate && !isRecurring">
      <q-separator spaced />
      <q-toggle
        v-model="notificationEnabled"
        label="Notificar"
        color="primary"
        @update:model-value="onNotificationToggle"
      />
      <template v-if="notificationEnabled">
        <q-select
          v-model="notificationDaysBefore"
          :options="notificationDaysBeforeOptions"
          label="Antecedência"
          emit-value
          map-options
          outlined
          class="q-mt-sm"
        />
        <q-input
          v-model="notificationTime"
          type="time"
          label="Horário"
          outlined
          class="q-mt-sm"
        />
      </template>
    </template>
  </div>
</template>

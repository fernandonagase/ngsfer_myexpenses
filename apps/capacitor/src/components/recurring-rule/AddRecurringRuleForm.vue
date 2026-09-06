<script setup lang="ts">
import { computed, watch } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'
import { useQuasar } from 'quasar'

import type { Category, Center } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { useCategoryStore } from 'src/stores/category-store'
import { recurrenceFrequencyOptions } from './recurrence-frequencies.js'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { useCenterStore } from 'src/stores/center-store.js'
import { notificationService } from 'src/services/notification-service'
import { NONE_LABEL } from 'src/models/center-scope'

const $q = useQuasar()

const centerStore = useCenterStore()

const value = defineModel<string>('value')
const category = defineModel<Category | null>('category')
const center = defineModel<Center | null>('center')
const startDate = defineModel<string>('startDate', { default: dayjs().format('YYYY-MM-DD') })
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })
const recurrenceFrequency = defineModel<FrequencyType>('recurrenceFrequency', {
  default: FrequencyType.MONTHLY,
})
const notificationEnabled = defineModel<boolean>('notificationEnabled', { default: false })
const notificationDaysBefore = defineModel<number | undefined>('notificationDaysBefore')
const notificationTime = defineModel<string | undefined>('notificationTime')

const centerOptions = computed(() => [
  { label: NONE_LABEL, value: null as number | null },
  ...centerStore.activeCenters.map((c) => ({ label: c.name, value: c.id })),
])

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}
const valueRules = [(val: string) => BRL(val).value !== 0 || 'Informe um valor diferente de 0']
const categoryRules = [(val: string) => !!val || 'Informe a categoria da operação']

const categoryStore = useCategoryStore()

const filteredCategories = computed<Array<Category>>(() =>
  operationType.value === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput,
)

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
          autofocus
        />
      </template>
    </q-field>
    <q-btn-toggle
      v-model="recurrenceFrequency"
      toggle-color="primary"
      :options="recurrenceFrequencyOptions"
      no-caps
      unelevated
      class="q-mb-md"
    />
    <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter outlined />
    <q-input
      v-model="startDate"
      type="date"
      label="Data"
      :rules="[(val: string) => !!val || 'Informe a data da operação']"
      lazy-rules
      outlined
    />
    <q-select
      v-model="category"
      :options="filteredCategories"
      label="Categoria"
      option-label="name"
      :rules="categoryRules"
      outlined
    />
    <q-select
      v-if="centerStore.hasActiveCenters"
      :model-value="center?.id ?? null"
      @update:model-value="(id) => (center = centerStore.activeCenters.find((c) => c.id === id) ?? null)"
      :options="centerOptions"
      emit-value
      map-options
      label="Centro financeiro"
      outlined
    />
    <q-separator spaced />
    <q-toggle
      v-model="notificationEnabled"
      label="Notificar operações geradas"
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
  </div>
</template>

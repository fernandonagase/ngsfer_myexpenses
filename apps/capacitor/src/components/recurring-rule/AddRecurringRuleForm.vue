<script setup lang="ts">
import { computed, watch } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'

import type { Category, Center } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { useCategoryStore } from 'src/stores/category-store'
import { recurrenceFrequencyOptions } from './recurrence-frequencies.js'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { useCenterStore } from 'src/stores/center-store.js'

const centerStore = useCenterStore()
await centerStore.fetchCenters()

const value = defineModel<string>('value')
const category = defineModel<Category | null>('category')
const center = defineModel<Center | null>('center')
const startDate = defineModel<string>('startDate', { default: dayjs().format('YYYY-MM-DD') })
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })
const recurrenceFrequency = defineModel<FrequencyType>('recurrenceFrequency', {
  default: FrequencyType.MONTHLY,
})

center.value = centerStore.activeCenters[0]

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
      v-model="center"
      :options="centerStore.activeCenters"
      option-label="name"
      label="Centro financeiro"
      outlined
    />
  </div>
</template>

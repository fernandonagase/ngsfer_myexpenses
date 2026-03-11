<script setup lang="ts">
import { computed, watch } from 'vue'
import { BRL, getWeekdayName } from '@ngsfer-myexpenses/utils'

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
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })
const recurrenceFrequency = defineModel<FrequencyType | undefined>('recurrenceFrequency')
const isActive = defineModel<boolean>('isActive')
const interval = defineModel<number>('interval', { required: true })
const anchorDay = defineModel<number>('anchorDay', { required: true })

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
      readonly
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
      readonly
    />
    <p>
      Repete a cada {{ interval }}
      <template v-if="recurrenceFrequency === FrequencyType.MONTHLY">
        {{ interval === 1 ? 'mês' : 'meses' }} todo dia {{ anchorDay }}
      </template>
      <template v-if="recurrenceFrequency === FrequencyType.WEEKLY">
        semana(s) toda(o) {{ getWeekdayName(anchorDay as 0 | 1 | 2 | 3 | 4 | 5 | 6) }}
      </template>
    </p>
    <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter outlined />
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
      readonly
    />
    <q-toggle v-model="isActive" color="green" label="Ativa" />
  </div>
</template>

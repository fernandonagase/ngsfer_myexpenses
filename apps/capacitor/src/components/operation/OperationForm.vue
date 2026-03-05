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
    <q-option-group
      v-model="recurrenceType"
      color="secondary"
      :options="recurrenceTypeOptions"
      inline
    />
    <q-input
      v-if="hasInstallments"
      v-model.number="installmentCount"
      type="number"
      label="Número de parcelas"
      outlined
      class="q-mb-md"
      suffix="x"
    />
    <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter outlined />
    <q-input v-model="date" type="date" label="Data" :rules="dateRules" lazy-rules outlined />
    <q-checkbox v-model="isRecurring" label="Operação se repete" />
    <q-select
      v-model="category"
      :options="filteredCategories"
      label="Categoria"
      option-label="name"
      :rules="categoryRules"
      outlined
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import type { Category } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { useCategoryStore } from 'src/stores/category-store'

const value = defineModel<string>('value')
const isRecurring = defineModel<boolean>('isRecurring')
const installmentCount = defineModel<number>('installmentCount')
const date = defineModel<string>('date')
const category = defineModel<Category | null>('category')
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })

const recurrenceTypeOptions = [
  {
    value: 'one-time',
    label: 'À vista',
  },
  {
    value: 'installments',
    label: 'A prazo',
  },
  {
    value: 'recurring',
    label: 'Recorrente',
  },
]

type RecurrenceType = (typeof recurrenceTypeOptions)[number]['value']

const recurrenceType = defineModel<RecurrenceType>('recurrenceType', { default: 'one-time' })

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

const filteredCategories = computed<Array<Category>>(() =>
  operationType.value === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput,
)

const hasInstallments = computed(() => recurrenceType.value === 'installments')

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

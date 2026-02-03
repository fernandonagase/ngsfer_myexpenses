<template>
  <div>
    <q-field v-model="value" label="Valor" :rules="valueRules" lazy-rules outlined>
      <template v-slot:control="{ id, floatingLabel, modelValue, emitValue }">
        <input
          :id="id"
          class="q-field__input"
          :value="modelValue"
          @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
          v-money3="moneyFormatForDirective"
          v-show="floatingLabel"
          autofocus
        />
      </template>
    </q-field>
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
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { BRL } from 'src/helpers/currency'
import type { Category } from 'src/databases/entities/expenses'
import { useCategoryStore } from 'src/stores/category-store'

const value = defineModel<string>('value')
const date = defineModel<string>('date')
const category = defineModel<Category | null>('category')
const description = defineModel<string>('description')

const operationType = computed(() => (BRL(value.value).value > 0 ? 'Entrada' : 'Saída'))

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

const filteredCategories = ref<Array<Category>>(
  operationType.value === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput,
)
watch(operationType, () => {
  if (operationType.value === 'Entrada') {
    filteredCategories.value = categoryStore.datasetInput
  } else {
    filteredCategories.value = categoryStore.datasetOutput
  }
  category.value = filteredCategories.value[0]
})
</script>

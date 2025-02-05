<template>
  <div>
    <q-field v-model="value" label="Valor" :rules="valueRules" lazy-rules>
      <template v-slot:control="{ id, floatingLabel, modelValue, emitValue }">
        <input
          :id="id"
          class="q-field__input"
          :value="modelValue"
          @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
          v-money3="moneyFormatForDirective"
          v-show="floatingLabel"
        />
      </template>
    </q-field>
    <q-input v-model="date" type="date" label="Data" :rules="dateRules" lazy-rules />
    <q-select
      v-model="category"
      :options="filteredCategories"
      label="Categoria"
      option-label="name"
      :rules="categoryRules"
    />
    <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { BRL } from 'src/helpers/currency'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Category } from 'src/databases/entities/expenses'

const value = defineModel<string>('value')
const date = defineModel<string>('date')
const category = defineModel<Category>('category')
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

const categories = await expensesDataSource.dataSource.getRepository(Category).find()
const filteredCategories = ref<Array<Category>>()
watch(
  operationType,
  () => {
    filteredCategories.value = categories.filter(
      (category) => category.type === operationType.value,
    )
    category.value = filteredCategories.value[0]
  },
  { immediate: true },
)
</script>

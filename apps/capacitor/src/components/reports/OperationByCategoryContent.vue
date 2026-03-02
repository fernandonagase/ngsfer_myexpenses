<template>
  <q-tabs v-model="tab" class="text-teal">
    <q-tab name="Saída" icon="north_east" label="Saída" />
    <q-tab name="Entrada" icon="south_west" label="Entrada" />
  </q-tabs>
  <q-tab-panels v-model="tab" animated>
    <q-tab-panel name="Saída">
      <apexchart
        width="500"
        type="bar"
        :options="optionsExpenses"
        :series="seriesExpenses"
      ></apexchart>
      <!-- <q-list separator>
        <q-item v-for="item in categories.expenses" :key="item.category">
          <q-item-section>
            <q-item-label>{{ item.category }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label>{{ BRL(item.valueInCents / 100).format() }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list> -->
    </q-tab-panel>
    <q-tab-panel name="Entrada">
      <apexchart width="500" type="bar" :options="optionsIncome" :series="seriesIncome"></apexchart>

      <!-- <q-list separator>
        <q-item v-for="item in categories.income" :key="item.category">
          <q-item-section>
            <q-item-label>{{ item.category }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label>{{ BRL(item.valueInCents / 100).format() }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list> -->
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import { useOperationStore } from 'src/stores/operation-store'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'

const operationStore = useOperationStore()

const categories = await operationStore.getOperationsByCategory()

const tab = ref<CategoryType>('Saída')

const optionsExpenses = {
  chart: {
    id: 'operationsbycategory-expense',
  },
  plotOptions: {
    bar: {
      horizontal: true,
    },
  },
  dataLabels: {
    enabled: true,
    formatter: function (value: number) {
      return BRL(value / 100).format()
    },
  },
  xaxis: {
    categories: [] as string[],
    labels: {
      formatter: function (value: number) {
        return BRL(value / 100).format()
      },
    },
  },
}
const seriesExpenses = [
  {
    name: 'Saída',
    data: [] as number[],
  },
]

const optionsIncome = {
  chart: {
    id: 'operationsbycategory-income',
  },
  plotOptions: {
    bar: {
      horizontal: true,
    },
  },
  dataLabels: {
    enabled: true,
    formatter: function (value: number) {
      return BRL(value / 100).format()
    },
  },
  xaxis: {
    categories: [] as string[],
    labels: {
      formatter: function (value: number) {
        return BRL(value / 100).format()
      },
    },
  },
}
const seriesIncome = [
  {
    name: 'Entrada',
    data: [] as number[],
  },
]

categories.expenses.forEach((category) => {
  optionsExpenses.xaxis.categories.push(category.category)
  seriesExpenses[0]?.data.push(category.valueInCents * -1)
})

categories.income.forEach((category) => {
  optionsIncome.xaxis.categories.push(category.category)
  seriesIncome[0]?.data.push(category.valueInCents)
})
</script>

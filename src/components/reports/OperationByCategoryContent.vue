<template>
  <q-tabs v-model="tab" class="text-teal">
    <q-tab name="Saída" icon="north_east" label="Saída" />
    <q-tab name="Entrada" icon="south_west" label="Entrada" />
  </q-tabs>
  <q-tab-panels v-model="tab" animated>
    <q-tab-panel name="Saída">
      <q-list separator>
        <q-item v-for="item in categories.expenses" :key="item.category">
          <q-item-section>
            <q-item-label>{{ item.category }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label>{{ BRL(item.valueInCents / 100).format() }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-tab-panel>
    <q-tab-panel name="Entrada">
      <q-list separator>
        <q-item v-for="item in categories.income" :key="item.category">
          <q-item-section>
            <q-item-label>{{ item.category }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label>{{ BRL(item.valueInCents / 100).format() }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useOperationStore } from 'src/stores/operation-store'
import { BRL } from 'src/helpers/currency'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'

const operationStore = useOperationStore()

const categories = await operationStore.getOperationsByCategory()

const tab = ref<CategoryType>('Saída')
</script>

<template>
  <q-page>
    OPERAÇÕES FINANCEIRAS
    <q-list separator>
      <q-item v-for="operation in centerStore.operations" :key="operation.id">
        <q-item-section>
          <q-item-label v-if="operation.description">{{ operation.description }}</q-item-label>
          <q-item-label v-else>Não identificada</q-item-label>
          <q-item-label caption>{{ operation.dateString }}</q-item-label>
        </q-item-section>
        <q-item-section side :class="operation.isExpense ? 'text-negative' : 'text-positive'">
          {{ operation.valueString }}
        </q-item-section>
      </q-item>
      <q-item>
        <q-item-section>
          <q-item-label class="text-weight-bold">Total</q-item-label>
        </q-item-section>
        <q-item-section side>
          {{ BRL(centerStore.totalInCents / 100).format() }}
        </q-item-section>
      </q-item>
    </q-list>
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="accent" @click="centerStore.addOperation()" />
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { BRL } from 'src/helpers/currency'
import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()
</script>

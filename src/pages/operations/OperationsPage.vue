<template>
  <q-page>
    OPERAÇÕES FINANCEIRAS
    <ul>
      <li v-for="operation in centerStore.operations" :key="operation.id">
        {{ operation.description }} {{ operation.valueInCents }}
      </li>
    </ul>
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="accent" @click="centerStore.addOperation()" />
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()
</script>

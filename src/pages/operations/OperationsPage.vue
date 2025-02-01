<template>
  <q-page>
    OPERACOES FINANCEIRAS
    <ul>
      <li v-for="operation in operations" :key="operation.id">
        {{ operation.description }} {{ operation.valueInCents }}
      </li>
    </ul>
  </q-page>
</template>

<script setup lang="ts">
import { watch } from 'vue'

import { useOperations } from 'src/composables/useOperations'
import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()
const { operations, findAllOperationsBy } = useOperations()

if (centerStore.center) {
  await findAllOperationsBy(centerStore.center.id)
}

watch(
  () => centerStore.center,
  async (newCenter) => {
    if (newCenter) {
      await findAllOperationsBy(newCenter.id)
    }
  },
)
</script>

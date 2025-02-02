<template>
  <q-toolbar>
    <q-select
      v-model="operationStore.center"
      :options="centerStore.centers"
      option-label="name"
      borderless
      @update:model-value="
        (value) => {
          operationStore.setCenter(value)
        }
      "
    />
    <q-space />
    <q-btn icon="more_vert" flat round dense>
      <q-menu>
        <q-list style="min-width: 100px">
          <q-item clickable v-close-popup @click="centerStore.showCenters()">
            <q-item-section>Centros financeiros</q-item-section>
            <q-item-section side><q-icon name="account_balance" size="xs" /></q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
import { useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'

const centerStore = useCenterStore()
const operationStore = useOperationStore()

await centerStore.fetchCenters()

if (centerStore.centers ? centerStore.centers.length > 0 : false) {
  operationStore.center = centerStore.centers[0] ?? null
}
</script>

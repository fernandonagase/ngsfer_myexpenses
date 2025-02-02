<template>
  <q-toolbar>
    <q-select
      v-model="operationStore.center"
      :options="centers"
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
          <q-item clickable v-close-popup @click="showCenters()">
            <q-item-section>Centros financeiros</q-item-section>
            <q-item-section side><q-icon name="account_balance" size="xs" /></q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
import { useCenters } from 'src/composables/useCenters'
import { useOperationStore } from 'src/stores/operation-store'

const operationStore = useOperationStore()
const { centers, findAllCenters, showCenters } = useCenters()

await findAllCenters()

if (centers.value ? centers.value.length > 0 : false) {
  operationStore.center = centers.value[0] ?? null
}
</script>

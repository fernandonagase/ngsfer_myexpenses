<template>
  <q-toolbar>
    <q-select
      v-model="centerStore.center"
      :options="centers"
      option-label="name"
      borderless
      @update:model-value="
        (value) => {
          centerStore.setCenter(value)
        }
      "
    />
  </q-toolbar>
</template>

<script setup lang="ts">
import { useCenters } from 'src/composables/useCenters'
import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()
const { centers, findAllCenters } = useCenters()

await findAllCenters()

if (centers.value ? centers.value.length > 0 : false) {
  centerStore.center = centers.value[0] ?? null
}
</script>

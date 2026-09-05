<script setup lang="ts">
import { useQuasar } from 'quasar'

import { useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'
import SummaryDialog from '../summary/SummaryDialog.vue'
import { useConfigStore } from 'src/stores/config-store'

const $q = useQuasar()
const centerStore = useCenterStore()
const operationStore = useOperationStore()
const configStore = useConfigStore()

function showSummary() {
  $q.dialog({
    component: SummaryDialog,
  })
}
</script>

<template>
  <div class="row full-width items-center">
    <div class="col-xs-6 col-sm-5 col-md-4 flex justify-start">
      <div class="center-select">
        <q-select
          v-model="operationStore.center"
          :options="centerStore.activeCenters"
          option-label="name"
          borderless
          label-color="negative"
          hide-dropdown-icon
          @update:model-value="operationStore.setCenter"
        >
          <template #append> <q-icon name="arrow_drop_down" color="white" /> </template>
        </q-select>
      </div>
    </div>
    <div class="col"></div>
    <div class="col-xs-auto flex justify-end items-center no-wrap q-gutter-x-xs">
      <q-btn
        :icon="configStore.hideValues ? 'visibility_off' : 'visibility'"
        flat
        round
        dense
        @click="configStore.toggleValuesVisibility()"
      >
        <q-tooltip>
          {{ configStore.hideValues ? 'Mostrar valores' : 'Ocultar valores' }}
        </q-tooltip>
      </q-btn>
      <q-btn icon="description" flat round dense @click="showSummary()" />
    </div>
  </div>
</template>

<style lang="scss">
.center-select .q-field__native span {
  color: #fff;
}
</style>

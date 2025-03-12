<template>
  <q-toolbar>
    <div class="row full-width items-center">
      <div class="col-xs-4"></div>
      <div class="col-xs-4 flex justify-center">
        <div class="center-select">
          <q-select
            v-model="operationStore.center"
            :options="centerStore.centers"
            option-label="name"
            borderless
            label-color="negative"
            hide-dropdown-icon
            @update:model-value="operationStore.setCenter"
          >
            <template #after> <q-icon name="arrow_drop_down" color="white" /> </template>
          </q-select>
        </div>
      </div>
      <div class="col-xs-4 flex justify-end">
        <q-btn
          :icon="configStore.hideValues ? 'visibility_off' : 'visibility'"
          flat
          round
          dense
          @click="configStore.toggleValuesVisibility()"
        />
        <q-btn icon="description" flat round dense @click="showSummary()" />
        <q-btn icon="more_vert" flat round dense>
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="operationStore.showOperationsByCategory()">
                <q-item-section>Operações por categoria</q-item-section>
                <q-item-section side><q-icon name="account_balance" size="xs" /></q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="centerStore.showCenters()">
                <q-item-section>Centros financeiros</q-item-section>
                <q-item-section side><q-icon name="account_balance" size="xs" /></q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="categoryStore.showCategories()">
                <q-item-section>Categorias</q-item-section>
                <q-item-section side><q-icon name="label" size="xs" /></q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup :to="{ name: 'settings' }">
                <q-item-section>Configurações</q-item-section>
                <q-item-section side><q-icon name="settings" size="xs" /></q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
  </q-toolbar>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar'

import { useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'
import SummaryDialog from '../summary/SummaryDialog.vue'
import { useCategoryStore } from 'src/stores/category-store'
import { useConfigStore } from 'src/stores/config-store'

const $q = useQuasar()
const centerStore = useCenterStore()
const categoryStore = useCategoryStore()
const operationStore = useOperationStore()
const configStore = useConfigStore()

await centerStore.fetchCenters()
await categoryStore.fetch()

if (centerStore.centers ? centerStore.centers.length > 0 : false) {
  operationStore.center = centerStore.centers[0] ?? null
}

function showSummary() {
  $q.dialog({
    component: SummaryDialog,
  })
}
</script>

<style lang="scss">
.center-select .q-field__native span {
  color: #fff;
}
</style>

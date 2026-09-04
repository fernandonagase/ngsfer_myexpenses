<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useOperationStore } from 'src/stores/operation-store'

const route = useRoute()
const operationStore = useOperationStore()

type FooterTab = 'home' | 'operations' | 'invoices' | 'reports' | 'more'

const activeTab = computed<FooterTab>(() => {
  if (route.name === 'invoices' || route.path.startsWith('/invoices')) {
    return 'invoices'
  }
  if (route.name === 'operations-by-category' || route.path.startsWith('/reports')) {
    return 'reports'
  }
  if (
    route.name === 'settings' ||
    route.name === 'recurrence' ||
    route.path.startsWith('/settings') ||
    route.path.startsWith('/recurrence')
  ) {
    return 'more'
  }
  if (route.name === 'operations') {
    return 'operations'
  }
  return 'home'
})

function tabColor(tab: FooterTab) {
  return activeTab.value === tab ? 'primary' : 'grey-6'
}
</script>

<template>
  <q-toolbar class="bg-white text-dark main-footer-toolbar q-px-xs">
    <div class="col row justify-center">
      <q-btn
        stack
        flat
        no-caps
        label="Início"
        icon="home"
        :color="tabColor('home')"
        class="col-6"
        :to="{ name: 'home' }"
      />
      <q-btn
        stack
        flat
        no-caps
        label="Lançamentos"
        icon="list_alt"
        :color="tabColor('operations')"
        class="col-6"
        :to="{ name: 'operations' }"
      />
    </div>
    <div class="fab-space"></div>
    <div class="col row justify-center">
      <q-btn
        stack
        flat
        no-caps
        label="Faturas"
        icon="receipt_long"
        :color="tabColor('invoices')"
        class="col-4"
        :to="{ name: 'invoices' }"
      />
      <q-btn
        stack
        flat
        no-caps
        label="Relatório"
        icon="trending_up"
        :color="tabColor('reports')"
        class="col-4"
        :to="{ name: 'operations-by-category' }"
      />
      <q-btn
        stack
        flat
        no-caps
        label="Mais"
        icon="menu"
        :color="tabColor('more')"
        class="col-4"
        :to="{ name: 'settings' }"
      />
    </div>
    <q-btn
      class="main-footer-add"
      fab
      icon="add"
      color="primary"
      @click="operationStore.addOperation()"
    />
  </q-toolbar>
</template>

<style scoped lang="scss">
.main-footer-toolbar {
  border-top: 1px solid $grey-4;
  position: relative;
  overflow: visible;
}

.main-footer-add {
  position: absolute !important;
  left: 50% !important;
  top: -20px !important;
  transform: translateX(-50%) !important;
  z-index: 10;
}

.fab-space {
  width: 56px;
}
</style>

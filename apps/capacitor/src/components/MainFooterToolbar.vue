<script setup lang="ts">
import { useOperationStore } from 'src/stores/operation-store'

const operationStore = useOperationStore()
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
        color="primary"
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
        label="Relatório"
        icon="trending_up"
        color="primary"
        class="col-6"
        :to="{ name: 'operations-by-category' }"
      />
      <q-btn
        stack
        flat
        no-caps
        label="Mais"
        icon="menu"
        color="primary"
        class="col-6"
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

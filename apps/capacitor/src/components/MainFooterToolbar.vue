<script setup lang="ts">
import { useOperationStore } from 'src/stores/operation-store'
import { FOOTER_TABS, type FooterTab } from 'src/router/chrome'

const props = withDefaults(defineProps<{ activeTab?: FooterTab | null }>(), {
  activeTab: null,
})
const operationStore = useOperationStore()

const leftTabs = FOOTER_TABS.slice(0, 2)
const rightTabs = FOOTER_TABS.slice(2)

function tabColor(tab: FooterTab) {
  return props.activeTab === tab ? 'primary' : 'grey-6'
}
</script>

<template>
  <q-toolbar class="bg-white text-dark main-footer-toolbar q-px-xs">
    <div class="col row justify-center">
      <q-btn
        v-for="item in leftTabs"
        :key="item.tab"
        stack
        flat
        no-caps
        :label="item.label"
        :icon="item.icon"
        :color="tabColor(item.tab)"
        class="col-6"
        :to="{ name: item.route }"
      />
    </div>
    <div class="fab-space"></div>
    <div class="col row justify-center">
      <q-btn
        v-for="item in rightTabs"
        :key="item.tab"
        stack
        flat
        no-caps
        :label="item.label"
        :icon="item.icon"
        :color="tabColor(item.tab)"
        class="col-6"
        :to="{ name: item.route }"
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

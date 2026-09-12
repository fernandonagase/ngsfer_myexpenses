<script setup lang="ts">
import { useOperationStore } from 'src/stores/operation-store'
import { FOOTER_TABS, type FooterTab } from 'src/router/chrome'

defineProps<{ activeTab: FooterTab | null }>()
const operationStore = useOperationStore()

const leftTabs = FOOTER_TABS.slice(0, 2)
const rightTabs = FOOTER_TABS.slice(2)
</script>

<template>
  <nav class="main-footer">
    <router-link
      v-for="item in leftTabs"
      :key="item.tab"
      :to="{ name: item.route }"
      class="main-footer__tab"
      :class="{ 'main-footer__tab--active': activeTab === item.tab }"
      :aria-label="item.label"
    >
      <q-icon :name="item.icon" size="24px" />
      <span class="main-footer__label">{{ item.label }}</span>
    </router-link>

    <div class="main-footer__fab-space"></div>

    <router-link
      v-for="item in rightTabs"
      :key="item.tab"
      :to="{ name: item.route }"
      class="main-footer__tab"
      :class="{ 'main-footer__tab--active': activeTab === item.tab }"
      :aria-label="item.label"
    >
      <q-icon :name="item.icon" size="24px" />
      <span class="main-footer__label">{{ item.label }}</span>
    </router-link>

    <button
      type="button"
      class="main-footer__add"
      aria-label="Nova operação"
      @click="operationStore.addOperation()"
    >
      <q-icon name="add" size="28px" />
    </button>
  </nav>
</template>

<style scoped lang="scss">
.main-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 64px;
  padding-bottom: 6px;
  background: #fff;
  border-top: 1px solid #e6ebe9;
  overflow: visible;
}

.main-footer__tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 56px;
  color: #8a978f;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.main-footer__tab--active {
  color: var(--ds-header);

  .main-footer__label {
    font-weight: 700;
  }
}

.main-footer__label {
  font-size: 10.5px;
  font-weight: 500;
  line-height: 1;
}

.main-footer__fab-space {
  width: 56px;
}

.main-footer__add {
  position: absolute;
  left: 50%;
  top: -22px;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  padding: 0;
  background: var(--ds-header);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(58, 90, 64, 0.4);
  cursor: pointer;
  z-index: 10;
}
</style>

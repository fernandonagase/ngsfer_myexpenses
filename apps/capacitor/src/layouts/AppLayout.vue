<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { StatusBar } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { getCssVar } from 'quasar'

import MainFooterToolbar from 'src/components/MainFooterToolbar.vue'
import { resolveChrome } from 'src/router/chrome'
import { useAppNavigation } from 'src/composables/useAppNavigation'
import { useCenterStore } from 'src/stores/center-store'
import { useCategoryStore } from 'src/stores/category-store'
import { useOperationStore } from 'src/stores/operation-store'

const route = useRoute()
const chrome = computed(() => resolveChrome(route.meta))
const { goBack } = useAppNavigation()

const centerStore = useCenterStore()
const categoryStore = useCategoryStore()
const operationStore = useOperationStore()

if (Capacitor.isNativePlatform()) {
  const qPrimaryColor = getCssVar('primary')
  if (qPrimaryColor) {
    void StatusBar.setBackgroundColor({ color: qPrimaryColor })
  }
}

await centerStore.fetchCenters()
await categoryStore.fetch()
await operationStore.refreshCenter()
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="app-layout">
    <q-header v-if="chrome.showHeader">
      <q-toolbar>
        <q-btn
          v-if="chrome.showBack"
          flat
          dense
          round
          icon="arrow_back"
          aria-label="Voltar"
          @click="goBack"
        />
        <q-toolbar-title>{{ chrome.title }}</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="app-layout__fallback">Carregando...</div>
          </template>
        </Suspense>
      </router-view>
    </q-page-container>

    <q-footer v-if="chrome.showFooter" class="app-layout__footer">
      <MainFooterToolbar :active-tab="chrome.activeTab" />
    </q-footer>
  </q-layout>
</template>

<style lang="scss" scoped>
.app-layout {
  background: var(--ds-surface);
}

.app-layout__fallback {
  padding: 32px 16px;
  text-align: center;
  color: var(--ds-faint);
}

.app-layout__footer {
  background: transparent;
}
</style>

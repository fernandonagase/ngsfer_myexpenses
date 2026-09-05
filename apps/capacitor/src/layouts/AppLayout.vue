<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import CenterToolbar from 'src/components/center/CenterToolbar.vue'
import MainFooterToolbar from 'src/components/MainFooterToolbar.vue'
import { resolveChrome } from 'src/router/chrome'
import { useAppNavigation } from 'src/composables/useAppNavigation'
import { useCenterStore } from 'src/stores/center-store'
import { useCategoryStore } from 'src/stores/category-store'
import { useOperationStore } from 'src/stores/operation-store'

const route = useRoute()
const chrome = computed(() => resolveChrome(route.meta))
const { goBack, goToSettings } = useAppNavigation()

const centerStore = useCenterStore()
const categoryStore = useCategoryStore()
const operationStore = useOperationStore()

await centerStore.fetchCenters()
await categoryStore.fetch()
if (operationStore.center === null) {
  operationStore.center = centerStore.activeCenters[0] ?? null
}
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
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
        <CenterToolbar v-if="chrome.toolbar === 'center'" />
        <q-toolbar-title v-else>
          {{ chrome.title }}
          <span v-if="chrome.showCenterLabel && operationStore.center" class="text-subtitle2">
            · {{ operationStore.center.name }}
          </span>
        </q-toolbar-title>
        <q-btn
          v-if="chrome.showSettings"
          flat
          dense
          round
          icon="settings"
          aria-label="Configurações"
          @click="goToSettings"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback> Carregando... </template>
        </Suspense>
      </router-view>
    </q-page-container>

    <q-footer v-if="chrome.showFooter">
      <MainFooterToolbar :active-tab="chrome.activeTab" />
    </q-footer>
  </q-layout>
</template>

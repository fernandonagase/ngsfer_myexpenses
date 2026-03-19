<script setup lang="ts">
import MainFooterToolbar from 'src/components/MainFooterToolbar.vue';
import ReportsToolbar from 'src/components/reports/ReportsToolbar.vue'
</script>

<template>
  <Suspense>
    <q-layout view="lHh Lpr lFf">
      <q-header>
        <ReportsToolbar />
      </q-header>

      <q-page-container>
        <router-view />
      </q-page-container>

      <q-footer>
        <MainFooterToolbar />
      </q-footer>
    </q-layout>
    <template #fallback> Carregando... </template>
  </Suspense>
</template>

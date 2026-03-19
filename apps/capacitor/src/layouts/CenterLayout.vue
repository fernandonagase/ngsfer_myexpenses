<script setup lang="ts">
import CenterToolbar from 'src/components/center/CenterToolbar.vue'
import MainFooterToolbar from 'src/components/MainFooterToolbar.vue';
</script>

<template>
  <Suspense>
    <q-layout view="lHh Lpr lFf">
      <q-header>
        <CenterToolbar />
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


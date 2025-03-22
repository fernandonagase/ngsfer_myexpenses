<template>
  <Suspense>
    <q-layout view="lHh Lpr lFf">
      <q-header>
        <CenterToolbar />
      </q-header>

      <q-page-container>
        <router-view />
      </q-page-container>
    </q-layout>
    <template #fallback> Carregando... </template>
  </Suspense>
</template>

<script setup lang="ts">
import CenterToolbar from 'src/components/center/CenterToolbar.vue'
</script>

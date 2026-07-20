<script setup lang="ts">
import MainFooterToolbar from 'src/components/MainFooterToolbar.vue'
</script>

<template>
  <Suspense>
    <q-layout view="lHh Lpr lFf">
      <q-header>
        <q-toolbar>
          <q-toolbar-title>Faturas</q-toolbar-title>
        </q-toolbar>
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

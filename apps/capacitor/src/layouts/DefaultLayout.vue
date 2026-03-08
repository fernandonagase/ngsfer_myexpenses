<script setup lang="ts">
interface DefaultLayoutProps {
  title: string
}

defineProps<DefaultLayoutProps>()
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
      <q-toolbar>
        <q-btn flat dense round icon="arrow_back" aria-label="Voltar" @click="$router.back()" />
        <q-toolbar-title> {{ title }} </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <Suspense>
        <router-view />
      </Suspense>
    </q-page-container>
  </q-layout>
</template>

<template>
  <q-card class="q-dialog-plugin bottom-sheet-card">
    <q-card-section class="row items-center no-wrap">
      <div class="text-h6 col">{{ title }}</div>
      <slot name="header-side" />
    </q-card-section>
    <q-card-section>
      <slot />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style lang="scss" scoped>
.bottom-sheet-card {
  border-radius: 20px 20px 0 0;
}
</style>

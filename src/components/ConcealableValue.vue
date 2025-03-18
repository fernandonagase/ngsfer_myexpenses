<script setup lang="ts">
import { useConfigStore } from 'src/stores/config-store'

const configStore = useConfigStore()
</script>

<template>
  <template v-if="!configStore.hideValues">
    <slot></slot>
  </template>
  <span v-else>***</span>
</template>

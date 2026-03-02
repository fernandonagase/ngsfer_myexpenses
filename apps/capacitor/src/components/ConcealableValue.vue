<script setup lang="ts">
import { useConfigStore } from 'src/stores/config-store'

defineProps<{
  concealedClass?: string
}>()

const configStore = useConfigStore()
</script>

<template>
  <template v-if="!configStore.hideValues">
    <slot></slot>
  </template>
  <span v-else :class="concealedClass ?? ''">***</span>
</template>

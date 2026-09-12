<template>
  <div v-if="hasError">
    <q-banner class="text-white bg-red"> Algo deu errado :( </q-banner>
  </div>
  <div v-else class="error-boundary">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)

onErrorCaptured((error) => {
  console.error(error)
  hasError.value = true
  return false
})
</script>

<style lang="scss" scoped>
// Repassa o layout em coluna (e o gap) do container pai para os filhos do slot.
.error-boundary {
  display: flex;
  flex-direction: column;
  gap: inherit;
}
</style>

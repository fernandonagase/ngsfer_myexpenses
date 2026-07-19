<template>
  <div v-if="hasError">
    <q-banner class="text-white bg-red"> Algo deu errado :( </q-banner>
  </div>
  <div v-else>
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

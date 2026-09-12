<script setup lang="ts">
/**
 * Corpo rolável que sobe sobre o cabeçalho verde (margin-top negativo),
 * criando o efeito de cards "flutuando" sobre o header.
 */
withDefaults(defineProps<{ gap?: string; bottomPadding?: string }>(), {
  gap: '14px',
  bottomPadding: '100px',
})
</script>

<template>
  <div class="screen-body" :style="{ gap, paddingBottom: bottomPadding }">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.screen-body {
  display: flex;
  flex-direction: column;
  padding: 0 16px;
  margin-top: -48px;
}
</style>

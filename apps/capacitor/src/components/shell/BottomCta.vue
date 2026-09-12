<script setup lang="ts">
/**
 * Área fixa no rodapé das telas empilhadas (sem barra de abas) para o botão
 * principal — "Novo cartão", "Nova categoria" etc. Degradê cobre o fim da lista.
 */
</script>

<template>
  <div class="bottom-cta">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.bottom-cta {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  padding: 14px 16px calc(22px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--ds-surface) 70%, rgba(245, 247, 246, 0));
}

:deep(.bottom-cta__primary) {
  width: 100%;
  padding: 15px 0;
  border-radius: 14px;
  font-size: 15px;
  gap: 8px;
  box-shadow: 0 6px 16px rgba(58, 90, 64, 0.32);
}

:deep(.bottom-cta__note) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--ds-border);
  color: #8a978f;
  border-radius: 14px;
  padding: 15px 12px;
  font-size: 13.5px;
  font-weight: 500;
  text-align: center;
  background: var(--ds-card);
}
</style>

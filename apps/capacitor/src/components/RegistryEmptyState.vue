<script setup lang="ts">
/**
 * Estado vazio dos cadastros: ícone, explicação e botão primário no card,
 * com slot para blocos extras (ex.: sugestões) e uma dica ao pé.
 */
defineProps<{
  icon: string
  title: string
  body: string
  addLabel: string
  hint?: string
}>()

defineEmits<{ add: [] }>()
</script>

<template>
  <div class="ds-card empty-state">
    <div class="empty-state__icon">
      <q-icon :name="icon" size="30px" />
    </div>
    <div class="empty-state__text">
      <div class="empty-state__title">{{ title }}</div>
      <div class="empty-state__body">{{ body }}</div>
    </div>
    <button
      type="button"
      class="ds-block-btn ds-block-btn--primary empty-state__cta"
      @click="$emit('add')"
    >
      <q-icon name="add" size="20px" />
      {{ addLabel }}
    </button>
  </div>
  <slot />
  <div v-if="hint" class="ds-hint empty-state__hint">{{ hint }}</div>
</template>

<style lang="scss" scoped>
.empty-state {
  padding: 34px 22px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
}

.empty-state__icon {
  width: 66px;
  height: 66px;
  border-radius: 22px;
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state__text {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.empty-state__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-ink);
  letter-spacing: -0.01em;
}

.empty-state__body {
  font-size: 13px;
  line-height: 1.55;
  color: var(--ds-muted);
  text-wrap: pretty;
}

.empty-state__cta {
  align-self: stretch;
  margin-top: 4px;
  padding: 14px 0;
  border-radius: 14px;
  font-size: 15px;
  gap: 8px;
}

.empty-state__hint {
  padding: 0 4px;
}
</style>

<script setup lang="ts">
import ScopePill from './ScopePill.vue'
import { useConfigStore } from 'src/stores/config-store'
import { useAppNavigation } from 'src/composables/useAppNavigation'

withDefaults(
  defineProps<{
    /** Título à esquerda (com seta de voltar quando `back`). Sem título → pílula de escopo. */
    title?: string
    back?: boolean
    /** Esconde o seletor de escopo mesmo sem título (ex.: aba "Mais"). */
    hideScope?: boolean
    /** Esconde o botão de ocultar/mostrar valores. */
    hideEye?: boolean
    /** Título grande no lugar da linha superior (aba "Mais"). */
    heading?: string
  }>(),
  { back: false, hideScope: false, hideEye: false },
)

const configStore = useConfigStore()
const { goBack } = useAppNavigation()
</script>

<template>
  <header class="screen-header">
    <div v-if="heading" class="screen-header__heading">{{ heading }}</div>
    <div v-else class="screen-header__top">
      <div v-if="title" class="screen-header__title-wrap">
        <button
          v-if="back"
          type="button"
          class="screen-header__icon-btn"
          aria-label="Voltar"
          @click="goBack"
        >
          <q-icon name="arrow_back" size="22px" />
        </button>
        <div class="screen-header__title">{{ title }}</div>
      </div>
      <ScopePill v-else-if="!hideScope" />
      <div v-else></div>

      <button
        v-if="!hideEye"
        type="button"
        class="screen-header__icon-btn"
        :aria-label="configStore.hideValues ? 'Mostrar valores' : 'Ocultar valores'"
        @click="configStore.toggleValuesVisibility()"
      >
        <q-icon :name="configStore.hideValues ? 'visibility_off' : 'visibility'" size="22px" />
      </button>
    </div>

    <slot name="chips" />

    <div v-if="$slots.hero" class="screen-header__hero">
      <slot name="hero" />
    </div>

    <slot />
  </header>
</template>

<style lang="scss" scoped>
.screen-header {
  background: var(--ds-header);
  color: #fff;
  padding: 18px 20px 64px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.screen-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
}

.screen-header__title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: -10px;
}

.screen-header__title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.screen-header__heading {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  padding-top: 10px;
}

.screen-header__icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: rgba(255, 255, 255, 0.12);
  }
}

.screen-header__hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// Estilos compartilhados pelos slots de hero das páginas
:deep(.screen-header__caption) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ds-header-fg-muted);
  letter-spacing: 0.02em;
}

:deep(.screen-header__value) {
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: #fff;
}

:deep(.screen-header__value--negative) {
  color: var(--ds-negative-on-header);
}
</style>

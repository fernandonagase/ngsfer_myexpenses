<script setup lang="ts">
/**
 * Casca visual dos formulários em folha (cadastros): puxador, título, campos
 * no slot e rodapé Cancelar/Salvar. O dialog dono cuida do useDialogPluginComponent.
 */
withDefaults(
  defineProps<{
    title: string
    submitLabel?: string
    canSubmit?: boolean
  }>(),
  { submitLabel: 'Salvar', canSubmit: true },
)

const emit = defineEmits<{ cancel: []; submit: [] }>()

function onSubmit(event: Event) {
  event.preventDefault()
  emit('submit')
}
</script>

<template>
  <q-card class="q-dialog-plugin form-sheet">
    <form class="form-sheet__form" novalidate @submit="onSubmit">
      <div class="form-sheet__handle"></div>
      <div class="form-sheet__title">{{ title }}</div>
      <slot />
      <div class="form-sheet__actions">
        <button
          type="button"
          class="ds-block-btn ds-block-btn--outline form-sheet__cancel"
          @click="$emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="ds-block-btn form-sheet__submit"
          :class="canSubmit ? 'ds-block-btn--primary' : 'ds-block-btn--disabled'"
          :aria-disabled="!canSubmit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </form>
  </q-card>
</template>

<style lang="scss" scoped>
.form-sheet {
  border-radius: 20px 20px 0 0;
}

.form-sheet__form {
  padding: 12px 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdcdc;
  align-self: center;
}

.form-sheet__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ds-ink);
}

.form-sheet__actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}

.form-sheet__cancel {
  flex: 1;
  padding: 14px 0;
}

.form-sheet__submit {
  flex: 2;
  padding: 14px 0;
}
</style>

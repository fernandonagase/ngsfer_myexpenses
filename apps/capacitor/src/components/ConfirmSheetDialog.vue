<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

withDefaults(
  defineProps<{
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Ação irreversível: botão vermelho e ícone de alerta. */
    destructive?: boolean
  }>(),
  { confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', destructive: false },
)

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="q-dialog-plugin confirm-sheet">
      <div class="confirm-sheet__handle"></div>
      <div class="confirm-sheet__title-row">
        <q-icon v-if="destructive" name="warning" size="24px" class="confirm-sheet__warning" />
        <div class="confirm-sheet__title">{{ title }}</div>
      </div>
      <div v-if="message" class="confirm-sheet__message">{{ message }}</div>
      <div class="confirm-sheet__actions">
        <button
          type="button"
          class="ds-block-btn ds-block-btn--outline ds-block-btn--grow"
          @click="onDialogCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="ds-block-btn ds-block-btn--grow"
          :class="destructive ? 'ds-block-btn--danger' : 'ds-block-btn--primary'"
          @click="onDialogOK()"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<style lang="scss" scoped>
.confirm-sheet {
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.confirm-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdcdc;
  align-self: center;
}

.confirm-sheet__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.confirm-sheet__warning {
  color: var(--ds-expense);
}

.confirm-sheet__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-ink);
}

.confirm-sheet__message {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ds-muted);
}

.confirm-sheet__actions {
  display: flex;
  gap: 8px;
}
</style>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

/** Uma ação da folha; `value` é devolvido em onOk. */
export type SheetAction<T extends string = string> = {
  value: T
  label: string
  icon: string
  /** Ação destrutiva: texto em vermelho. */
  danger?: boolean
}

defineProps<{
  title: string
  meta?: string
  actions: ReadonlyArray<SheetAction>
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="q-dialog-plugin action-sheet">
      <div class="action-sheet__handle"></div>
      <div class="action-sheet__head">
        <div class="action-sheet__title">{{ title }}</div>
        <div v-if="meta" class="action-sheet__meta">{{ meta }}</div>
      </div>
      <button
        v-for="action in actions"
        :key="action.value"
        type="button"
        class="action-sheet__item"
        :class="{ 'action-sheet__item--danger': action.danger }"
        @click="onDialogOK(action.value)"
      >
        <q-icon :name="action.icon" size="22px" />
        <span>{{ action.label }}</span>
      </button>
      <button type="button" class="action-sheet__cancel" @click="onDialogCancel">Cancelar</button>
    </q-card>
  </q-dialog>
</template>

<style lang="scss" scoped>
.action-sheet {
  border-radius: 20px 20px 0 0;
  padding: 12px 12px 22px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-sheet__handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdcdc;
  align-self: center;
  margin-bottom: 6px;
}

.action-sheet__head {
  padding: 4px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-sheet__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--ds-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-sheet__meta {
  font-size: 12.5px;
  color: var(--ds-faint);
}

.action-sheet__item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  border-radius: 12px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  color: var(--ds-ink);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--ds-surface);
  }
}

.action-sheet__item--danger {
  color: var(--ds-expense);
}

.action-sheet__cancel {
  margin-top: 6px;
  padding: 13px 0;
  border-radius: 12px;
  border: 1px solid var(--ds-border);
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  color: #5c6b66;
  cursor: pointer;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'

import FormSheet from 'src/components/FormSheet.vue'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import type { CategoryFormPayload } from 'src/stores/category-store'

const props = withDefaults(
  defineProps<{
    title?: string
    name?: string
    type?: CategoryType
    isDefault?: boolean
    /** Edição: o tipo não muda (as operações já pertencem a ele). */
    lockType?: boolean
  }>(),
  { name: '', type: 'Saída', isDefault: false, lockType: false },
)

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const name = ref(props.name)
const type = ref<CategoryType>(props.type)
const isDefault = ref(props.isDefault)

const canSubmit = computed(() => name.value.trim().length > 0)
const title = computed(() => props.title ?? 'Nova categoria')

const typeOptions: Array<{ value: CategoryType; icon: string }> = [
  { value: 'Saída', icon: 'north_east' },
  { value: 'Entrada', icon: 'south_west' },
]

function onSubmit() {
  if (!canSubmit.value) return
  onDialogOK({
    name: name.value.trim(),
    type: type.value,
    isDefault: isDefault.value,
  } satisfies CategoryFormPayload)
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <FormSheet
      :title="title"
      :submit-label="props.title?.startsWith('Editar') ? 'Salvar' : 'Criar'"
      :can-submit="canSubmit"
      @cancel="onDialogCancel"
      @submit="onSubmit"
    >
      <label class="ds-field">
        <span class="ds-field__label">Nome</span>
        <input
          v-model="name"
          class="ds-input"
          type="text"
          placeholder="Ex.: Mercado"
          maxlength="25"
          autocomplete="off"
        />
      </label>

      <div v-if="!lockType" class="ds-field">
        <span class="ds-field__label">Tipo</span>
        <div class="type-choice">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            class="type-choice__item"
            :class="{ 'type-choice__item--active': type === option.value }"
            @click="type = option.value"
          >
            <q-icon :name="option.icon" size="17px" />
            {{ option.value }}
          </button>
        </div>
      </div>

      <div
        class="default-row"
        role="switch"
        :aria-checked="isDefault"
        tabindex="0"
        @click="isDefault = !isDefault"
        @keydown.space.prevent="isDefault = !isDefault"
      >
        <div class="ds-row__body">
          <div class="default-row__title">Usar como padrão</div>
          <div class="ds-row__meta">Sugerida ao lançar uma nova operação</div>
        </div>
        <span class="ds-toggle" :class="{ 'ds-toggle--on': isDefault }">
          <span class="ds-toggle__knob"></span>
        </span>
      </div>
    </FormSheet>
  </q-dialog>
</template>

<style lang="scss" scoped>
.type-choice {
  display: flex;
  gap: 8px;
}

.type-choice__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 0;
  border-radius: 12px;
  border: 1.5px solid var(--ds-border);
  background: var(--ds-card);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #8a978f;
  cursor: pointer;
}

.type-choice__item--active {
  border-color: var(--ds-header);
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
}

.default-row {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.default-row__title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ds-ink);
}
</style>

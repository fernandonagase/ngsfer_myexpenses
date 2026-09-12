<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'

import FormSheet from 'src/components/FormSheet.vue'

const props = withDefaults(defineProps<{ title?: string; name?: string }>(), { name: '' })

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const name = ref(props.name)
const canSubmit = computed(() => name.value.trim().length > 0)
const isEdit = computed(() => Boolean(props.title?.startsWith('Editar')))

function onSubmit() {
  if (!canSubmit.value) return
  onDialogOK({ name: name.value.trim() })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <FormSheet
      :title="title ?? 'Novo centro'"
      :submit-label="isEdit ? 'Salvar' : 'Criar'"
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
          placeholder="Ex.: Pessoal"
          maxlength="25"
          autocomplete="off"
        />
      </label>
      <div class="ds-hint">
        Centros separam suas finanças (pessoal, família, empresa). Cada operação pertence a um
        centro; a tela inicial mostra um por vez.
      </div>
    </FormSheet>
  </q-dialog>
</template>

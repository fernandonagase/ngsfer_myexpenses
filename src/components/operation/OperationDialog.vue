<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Nova operação">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <Suspense>
          <OperationForm
            v-model:value="value"
            v-model:date="date"
            v-model:category="category"
            v-model:description="description"
            v-model:operation-type="operationType"
          />
          <template #fallback>Carregando...</template>
        </Suspense>
        <div class="flex justify-end">
          <q-btn label="Cancelar" color="negative" flat class="q-ml-sm" @click="onDialogCancel()" />
          <q-btn label="Confirmar" type="submit" unelevated color="primary" />
        </div>
      </q-form>
    </BottomSheetDialog>
  </q-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'

import { BRL } from 'src/helpers/currency'
import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import OperationForm from './OperationForm.vue'
import type { Category } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'

const props = defineProps<{
  value?: string
  date?: string
  category?: Category
  description?: string
  operationType?: CategoryType
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const value = ref<string>(props.value ?? '')
const date = ref<string>(props.date ?? dayjs().format('YYYY-MM-DD'))
const category = ref<Category | null>(props.category ?? null)
const description = ref<string>(props.description ?? '')
const operationType = ref<CategoryType>(props.operationType ?? 'Saída')

function onSubmit() {
  const valueInCents = Math.abs(BRL(value.value).multiply(100).value)
  onDialogOK({
    value: operationType.value === 'Entrada' ? valueInCents : -valueInCents,
    date: date.value,
    category: category.value,
    description: description.value,
  })
}
</script>

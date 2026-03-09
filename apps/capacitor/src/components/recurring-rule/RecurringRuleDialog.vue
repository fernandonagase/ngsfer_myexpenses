<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import RecurringRuleForm from './RecurringRuleForm.vue'
import type { Category } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { type FrequencyType } from 'src/databases/entities/expenses/recurring-rule'

const props = defineProps<{
  value?: string
  date?: string
  category?: Category
  description?: string
  operationType?: CategoryType
  recurrenceFrequency?: FrequencyType
  isActive?: boolean
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const value = ref<string>(props.value ?? '')
const date = ref<string>(props.date ?? dayjs().format('YYYY-MM-DD'))
const category = ref<Category | null>(props.category ?? null)
const description = ref<string>(props.description ?? '')
const operationType = ref<CategoryType>(props.operationType ?? 'Saída')
const recurrenceFrequency = ref<FrequencyType | undefined>(props.recurrenceFrequency)
const isActive = ref<boolean>(props.isActive)

function onSubmit() {
  const valueInCents = Math.abs(BRL(value.value).multiply(100).value)
  onDialogOK({
    valueInCents: operationType.value === 'Entrada' ? valueInCents : -valueInCents,
    description: description.value,
    category: category.value,
    isActive: isActive.value,
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Operação recorrente">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <Suspense>
          <RecurringRuleForm
            v-model:value="value"
            v-model:date="date"
            v-model:category="category"
            v-model:description="description"
            v-model:operation-type="operationType"
            v-model:recurrence-frequency="recurrenceFrequency"
            v-model:is-active="isActive"
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

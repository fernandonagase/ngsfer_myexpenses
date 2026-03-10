<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import AddRecurringRuleForm from './AddRecurringRuleForm.vue'
import type { Category, Center } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import {
  AnchorMode,
  EndMode,
  FrequencyType,
  RecurringRuleType,
} from 'src/databases/entities/expenses/recurring-rule'

const props = defineProps<{
  value?: string
  date?: string
  category?: Category
  center?: Center
  description?: string
  operationType?: CategoryType
  recurrenceFrequency?: FrequencyType
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const value = ref<string>(props.value ?? '')
const startDate = ref<string>(props.date ?? dayjs().format('YYYY-MM-DD'))
const category = ref<Category | null>(props.category ?? null)
const center = ref<Center | null>(props.center ?? null)
const description = ref<string>(props.description ?? '')
const operationType = ref<CategoryType>(props.operationType ?? 'Saída')
const recurrenceFrequency = ref<FrequencyType>(props.recurrenceFrequency ?? FrequencyType.MONTHLY)

function onSubmit() {
  const valueInCents = Math.abs(BRL(value.value).multiply(100).value)
  onDialogOK({
    valueInCents: operationType.value === 'Entrada' ? valueInCents : -valueInCents,
    description: description.value,
    category: category.value,
    center: center.value,
    startDate: startDate.value,
    isActive: true,
    frequency: recurrenceFrequency.value,
    interval: 1,
    ruleType:
      operationType.value === 'Entrada' ? RecurringRuleType.INCOME : RecurringRuleType.EXPENSE,
    nextRunDate: startDate.value,
    anchorMode: AnchorMode.FIXED,
    endMode: EndMode.NEVER,
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Operação recorrente">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <Suspense>
          <AddRecurringRuleForm
            v-model:value="value"
            v-model:start-date="startDate"
            v-model:category="category"
            v-model:center="center"
            v-model:description="description"
            v-model:operation-type="operationType"
            v-model:recurrence-frequency="recurrenceFrequency"
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

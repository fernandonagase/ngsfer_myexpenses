<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { computed, ref } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import OperationForm from './OperationForm.vue'
import type { Category, CreditCard, Center } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { type RecurrenceType } from './recurrence-types'
import type { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'

const props = defineProps<{
  value?: string
  date?: string
  category?: Category
  description?: string
  operationType?: CategoryType
  installmentCount?: number
  recurrenceType?: RecurrenceType
  recurrenceFrequency?: FrequencyType
  notes?: string
  notificationEnabled?: boolean
  notificationDaysBefore?: number
  notificationTime?: string
  paymentMethod?: 'cash' | 'credit'
  creditCard?: CreditCard | null
  center?: Center | null
  lockCenter?: boolean
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const value = ref<string>(props.value ?? '')
const date = ref<string>(props.date ?? dayjs().format('YYYY-MM-DD'))
const category = ref<Category | null>(props.category ?? null)
const description = ref<string>(props.description ?? '')
const operationType = ref<CategoryType>(props.operationType ?? 'Saída')
const installmentCount = ref<number>(props.installmentCount ?? 1)
const recurrenceType = ref<RecurrenceType>(props.recurrenceType ?? 'one-time')
const recurrenceFrequency = ref<FrequencyType | undefined>(props.recurrenceFrequency)
const notes = ref<string | undefined>(props.notes)
const notificationEnabled = ref<boolean>(props.notificationEnabled ?? false)
const notificationDaysBefore = ref<number | undefined>(props.notificationDaysBefore)
const notificationTime = ref<string | undefined>(props.notificationTime)
const paymentMethod = ref<'cash' | 'credit'>(props.paymentMethod ?? 'cash')
const creditCard = ref<CreditCard | null>(props.creditCard ?? null)
const center = ref<Center | null>(props.center ?? null)

const submitLabel = computed(() =>
  paymentMethod.value === 'credit' ? 'Lançar na fatura' : 'Confirmar',
)

function onSubmit() {
  const valueInCents = Math.abs(BRL(value.value).multiply(100).value)
  const isCredit = paymentMethod.value === 'credit'
  onDialogOK({
    value: operationType.value === 'Entrada' ? valueInCents : -valueInCents,
    date: date.value,
    category: category.value,
    description: description.value,
    installmentCount: installmentCount.value,
    recurrenceType: recurrenceType.value,
    recurrenceFrequency: recurrenceFrequency.value,
    notes: notes.value,
    notificationEnabled: notificationEnabled.value,
    notificationDaysBefore: notificationDaysBefore.value,
    notificationTime: notificationTime.value,
    isCredit,
    creditCard: isCredit ? creditCard.value : null,
    center: center.value,
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Nova operação" @dismiss="onDialogCancel">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <Suspense>
          <OperationForm
            v-model:value="value"
            v-model:date="date"
            v-model:category="category"
            v-model:description="description"
            v-model:operation-type="operationType"
            v-model:installment-count="installmentCount"
            v-model:recurrence-type="recurrenceType"
            v-model:recurrence-frequency="recurrenceFrequency"
            v-model:notes="notes"
            v-model:notification-enabled="notificationEnabled"
            v-model:notification-days-before="notificationDaysBefore"
            v-model:notification-time="notificationTime"
            v-model:payment-method="paymentMethod"
            v-model:credit-card="creditCard"
            v-model:center="center"
            :lock-center="lockCenter ?? false"
          />
          <template #fallback>Carregando...</template>
        </Suspense>
        <div class="flex justify-end">
          <q-btn label="Cancelar" color="negative" flat class="q-ml-sm" @click="onDialogCancel()" />
          <q-btn :label="submitLabel" type="submit" unelevated color="primary" />
        </div>
      </q-form>
    </BottomSheetDialog>
  </q-dialog>
</template>

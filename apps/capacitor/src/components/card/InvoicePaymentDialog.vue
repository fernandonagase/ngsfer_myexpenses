<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { BRL } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import type { CardInvoice } from 'src/databases/entities/expenses'
import type { InvoiceCenterShare } from 'src/stores/invoice-store'

const props = defineProps<{
  invoice: CardInvoice
  shares: InvoiceCenterShare[]
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}

const paymentDate = ref<string>(props.invoice.dueDate)

const rows = ref(
  props.shares.map((share) => ({
    centerId: share.centerId,
    centerName: share.centerName,
    value: BRL(Math.abs(share.valueInCents) / 100).format(),
  })),
)

const total = computed(() =>
  rows.value.reduce((acc, row) => acc + Math.abs(BRL(row.value).multiply(100).value), 0),
)

const totalString = computed(() => BRL(total.value / 100).format())

const dateRules = [(val: string) => !!val || 'Informe a data do pagamento']

function onSubmit() {
  const shares: InvoiceCenterShare[] = rows.value.map((row) => ({
    centerId: row.centerId,
    centerName: row.centerName,
    valueInCents: -Math.abs(BRL(row.value).multiply(100).value),
  }))
  onDialogOK({ paymentDate: paymentDate.value, shares })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Pagar fatura" @dismiss="onDialogCancel">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <p class="text-body2 text-grey-8 q-mb-none">
          Uma transferência será gerada por centro. Ajuste os valores e a data se necessário.
        </p>
        <q-input
          v-model="paymentDate"
          type="date"
          label="Data do pagamento"
          outlined
          :rules="dateRules"
          lazy-rules
        />
        <q-field
          v-for="row in rows"
          :key="row.centerId"
          v-model="row.value"
          :label="row.centerName"
          outlined
        >
          <template v-slot:control="{ id, floatingLabel, modelValue, emitValue }">
            <input
              :id="id"
              class="q-field__input"
              :value="modelValue"
              inputmode="decimal"
              @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
              v-money3="moneyFormatForDirective"
              v-show="floatingLabel"
            />
          </template>
        </q-field>
        <div class="row items-center justify-between text-weight-medium">
          <span>Total</span>
          <span>{{ totalString }}</span>
        </div>
        <div class="flex justify-end">
          <q-btn label="Cancelar" color="negative" flat class="q-ml-sm" @click="onDialogCancel()" />
          <q-btn label="Confirmar" type="submit" unelevated color="primary" />
        </div>
      </q-form>
    </BottomSheetDialog>
  </q-dialog>
</template>

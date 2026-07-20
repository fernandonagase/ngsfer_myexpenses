<script setup lang="ts">
import { ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { BRL } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'

const props = defineProps<{
  title?: string
  name?: string
  closingDay?: number
  dueDay?: number
  limitInCents?: number | null
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const name = ref(props.name ?? '')
const closingDay = ref(props.closingDay ?? 1)
const dueDay = ref(props.dueDay ?? 10)
const limitValue = ref(
  props.limitInCents != null ? BRL(props.limitInCents / 100).format() : '',
)

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}

const nameRules = [(val: string) => !!val?.trim() || 'Informe o nome do cartão']
const dayRules = [
  (val: number) => (Number.isInteger(val) && val >= 1 && val <= 31) || 'Informe um dia entre 1 e 31',
]

function onSubmit() {
  const trimmedName = name.value.trim()
  const limitInCents =
    limitValue.value && BRL(limitValue.value).value !== 0
      ? Math.abs(BRL(limitValue.value).multiply(100).value)
      : null

  onDialogOK({
    name: trimmedName,
    closingDay: closingDay.value,
    dueDay: dueDay.value,
    limitInCents,
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog :title="title ?? 'Cartão'" @dismiss="onDialogCancel">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-input
          v-model="name"
          type="text"
          label="Nome"
          maxlength="50"
          counter
          outlined
          :rules="nameRules"
          lazy-rules
        />
        <q-input
          v-model.number="closingDay"
          type="number"
          label="Dia de fechamento"
          outlined
          :rules="dayRules"
          lazy-rules
          min="1"
          max="31"
        />
        <q-input
          v-model.number="dueDay"
          type="number"
          label="Dia de vencimento"
          outlined
          :rules="dayRules"
          lazy-rules
          min="1"
          max="31"
        />
        <q-field v-model="limitValue" label="Limite (opcional)" outlined>
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
        <div class="flex justify-end">
          <q-btn label="Cancelar" color="negative" flat class="q-ml-sm" @click="onDialogCancel()" />
          <q-btn label="Confirmar" type="submit" unelevated color="primary" />
        </div>
      </q-form>
    </BottomSheetDialog>
  </q-dialog>
</template>

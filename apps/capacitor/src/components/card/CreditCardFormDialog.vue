<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { BRL } from '@ngsfer-myexpenses/utils'

import FormSheet from 'src/components/FormSheet.vue'

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
const closingDay = ref<number | null>(props.closingDay ?? 1)
const dueDay = ref<number | null>(props.dueDay ?? 10)
const limitValue = ref(props.limitInCents != null ? BRL(props.limitInCents / 100).format() : '')

const moneyFormatForDirective = {
  prefix: 'R$ ',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}

function isValidDay(day: number | null): day is number {
  return day != null && Number.isInteger(day) && day >= 1 && day <= 31
}

const nameOk = computed(() => name.value.trim().length > 0)
const closingOk = computed(() => isValidDay(closingDay.value))
const dueOk = computed(() => isValidDay(dueDay.value))
const canSubmit = computed(() => nameOk.value && closingOk.value && dueOk.value)
const isEdit = computed(() => Boolean(props.title?.startsWith('Editar')))

const cardHint = computed(() => {
  const closing = closingOk.value ? closingDay.value : 1
  const due = dueOk.value ? dueDay.value : 10
  return `Compras após o dia ${closing} entram na fatura seguinte, que vence no dia ${due}.`
})

function onSubmit() {
  if (!canSubmit.value) return
  const limitInCents =
    limitValue.value && BRL(limitValue.value).value !== 0
      ? Math.abs(BRL(limitValue.value).multiply(100).value)
      : null

  onDialogOK({
    name: name.value.trim(),
    closingDay: closingDay.value,
    dueDay: dueDay.value,
    limitInCents,
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <FormSheet
      :title="title ?? 'Novo cartão'"
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
          placeholder="Ex.: Nubank"
          maxlength="50"
          autocomplete="off"
        />
      </label>

      <div class="days">
        <label class="ds-field">
          <span class="ds-field__label">Fecha dia</span>
          <input
            v-model.number="closingDay"
            class="ds-input"
            type="number"
            inputmode="numeric"
            min="1"
            max="31"
          />
          <span v-if="!closingOk" class="ds-field__error">Entre 1 e 31</span>
        </label>
        <label class="ds-field">
          <span class="ds-field__label">Vence dia</span>
          <input
            v-model.number="dueDay"
            class="ds-input"
            type="number"
            inputmode="numeric"
            min="1"
            max="31"
          />
          <span v-if="!dueOk" class="ds-field__error">Entre 1 e 31</span>
        </label>
      </div>
      <div class="ds-hint days__hint">{{ cardHint }}</div>

      <label class="ds-field">
        <span class="ds-field__label">Limite <small>(opcional)</small></span>
        <input
          v-model.lazy="limitValue"
          v-money3="moneyFormatForDirective"
          class="ds-input"
          type="text"
          inputmode="decimal"
          placeholder="R$ 0,00"
        />
      </label>
    </FormSheet>
  </q-dialog>
</template>

<style lang="scss" scoped>
.days {
  display: flex;
  gap: 10px;

  .ds-field {
    flex: 1;
  }
}

.days__hint {
  margin-top: -8px;
}
</style>

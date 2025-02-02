<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-field v-model="value" label="Valor" :rules="valueRules" lazy-rules>
          <template v-slot:control="{ id, floatingLabel, modelValue, emitValue }">
            <input
              :id="id"
              class="q-field__input"
              :value="modelValue"
              @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
              v-money3="moneyFormatForDirective"
              v-show="floatingLabel"
            />
          </template>
        </q-field>
        <q-input v-model="date" type="date" label="Data" :rules="dateRules" lazy-rules />
        <q-input v-model="description" type="text" label="Descrição" maxlength="50" counter />
        <div>
          <q-btn label="Confirmar" type="submit" color="primary" />
          <q-btn label="Cancelar" color="negative" flat class="q-ml-sm" @click="onDialogCancel()" />
        </div>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'

import { BRL } from 'src/helpers/currency'

// const props = defineProps({
//   // ...your custom props
// })

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}
const valueRules = [(val: string) => BRL(val).value !== 0 || 'Informe um valor diferente de 0']
const dateRules = [(val: string) => !!val || 'Informe a data da operação']

const value = ref<string>('')
const date = ref<string>(dayjs().format('YYYY-MM-DD'))
const description = ref<string>('')

function onSubmit() {
  onDialogOK({
    value: BRL(value.value).multiply(100).value,
    date: date.value,
    description: description.value,
  })
}
</script>

<template>
  <div>
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
  </div>
</template>

<script setup lang="ts">
import { BRL } from 'src/helpers/currency'

const value = defineModel<string>('value')
const date = defineModel<string>('date')
const description = defineModel<string>('description')

const moneyFormatForDirective = {
  prefix: 'R$',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}
const valueRules = [(val: string) => BRL(val).value !== 0 || 'Informe um valor diferente de 0']
const dateRules = [(val: string) => !!val || 'Informe a data da operação']
</script>

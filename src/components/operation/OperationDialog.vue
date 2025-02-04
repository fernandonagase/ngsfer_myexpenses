<template>
  <q-dialog ref="dialogRef" persistent @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="text-h6">Nova operação</div>
      </q-card-section>
      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <Suspense>
            <OperationForm
              v-model:value="value"
              v-model:date="date"
              v-model:description="description"
            />
            <template #fallback>Carregando...</template>
          </Suspense>
          <div class="flex justify-end">
            <q-btn
              label="Cancelar"
              color="negative"
              flat
              class="q-ml-sm"
              @click="onDialogCancel()"
            />
            <q-btn label="Confirmar" type="submit" color="primary" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useDialogPluginComponent } from 'quasar'
import { ref } from 'vue'

import { BRL } from 'src/helpers/currency'
import OperationForm from './OperationForm.vue'

const props = defineProps<{
  value?: string
  date?: string
  description?: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const value = ref<string>(props.value ?? '')
const date = ref<string>(props.date ?? dayjs().format('YYYY-MM-DD'))
const description = ref<string>(props.description ?? '')

function onSubmit() {
  onDialogOK({
    value: BRL(value.value).multiply(100).value,
    date: date.value,
    description: description.value,
  })
}
</script>

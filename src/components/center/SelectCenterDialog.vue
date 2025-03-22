<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

import SelectCenterList from './SelectCenterList.vue'
import type { Center } from 'src/databases/entities/expenses'

const props = withDefaults(defineProps<{ exceptFn?: (center: Center) => boolean }>(), {
  exceptFn: () => false,
})
defineEmits([...useDialogPluginComponent.emits])

function exceptFnLocal(center: Center) {
  return props.exceptFn(center)
}

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>

<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="text-h6">Escolha o centro financeiro</div>
      </q-card-section>
      <q-card-section>
        <Suspense>
          <SelectCenterList :except-fn="exceptFnLocal" @select="(center) => onDialogOK(center)" />
          <template #fallback> Loading... </template>
        </Suspense>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

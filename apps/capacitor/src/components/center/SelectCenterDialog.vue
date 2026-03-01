<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
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
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Escolha o centro financeiro">
      <Suspense>
        <SelectCenterList :except-fn="exceptFnLocal" @select="(center) => onDialogOK(center)" />
        <template #fallback> Carregando... </template>
      </Suspense>
    </BottomSheetDialog>
  </q-dialog>
</template>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Operações por categoria">
      <Suspense>
        <OperationByCategoryContent />
        <template #fallback> Carregando... </template>
      </Suspense>
    </BottomSheetDialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import OperationByCategoryContent from './OperationByCategoryContent.vue'

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>

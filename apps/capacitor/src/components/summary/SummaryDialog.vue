<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Resumo por centro financeiro">
      <Suspense>
        <SummaryContent />
        <template #fallback> Carregando... </template>
      </Suspense>
    </BottomSheetDialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import SummaryContent from './SummaryContent.vue'

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>

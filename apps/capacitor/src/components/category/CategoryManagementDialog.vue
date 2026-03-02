<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Categorias">
      <Suspense>
        <CategoryManagement />
        <template #fallback> Carregando... </template>
      </Suspense>
    </BottomSheetDialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import CategoryManagement from './CategoryManagement.vue'

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>

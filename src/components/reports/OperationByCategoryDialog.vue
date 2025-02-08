<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin">
      <q-card-section>
        <div class="text-h6">Operações por categoria</div>
      </q-card-section>
      <q-card-section>
        <Suspense>
          <OperationByCategoryContent />
          <template #fallback> Loading... </template>
        </Suspense>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'
import OperationByCategoryContent from './OperationByCategoryContent.vue'

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide } = useDialogPluginComponent()
</script>

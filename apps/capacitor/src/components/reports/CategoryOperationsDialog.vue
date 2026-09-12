<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'
import dayjs from 'dayjs'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import OperationListItem from 'src/components/operation/OperationListItem.vue'
import OperationDetailsDialog, {
  type OperationDetailsAction,
} from 'src/components/operation/OperationDetailsDialog.vue'
import type { Operation } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { categoryIcon } from 'src/helpers/category-icons'
import { useOperationStore } from 'src/stores/operation-store'

const props = defineProps<{
  categoryName: string
  type: CategoryType
  month?: string
  periodLabel: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogCancel } = useDialogPluginComponent()
const $q = useQuasar()
const operationStore = useOperationStore()

const operations = ref<Operation[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    operations.value = await operationStore.getOperationsOfCategory(
      props.type,
      props.categoryName,
      props.month,
    )
  } finally {
    loading.value = false
  }
}

onMounted(load)

function meta(operation: Operation) {
  const parts = [dayjs(operation.date).format('DD/MM/YYYY')]
  if (operation.isCardPurchase) {
    parts.push(`Cartão ${operation.cardInvoice?.creditCard?.name ?? ''}`.trim())
  }
  if (operation.center?.name) parts.push(operation.center.name)
  return parts.join(' · ')
}

function openDetails(operation: Operation) {
  $q.dialog({
    component: OperationDetailsDialog,
    componentProps: { operation },
  }).onOk((action: OperationDetailsAction) => {
    if (action === 'edit') {
      operationStore.editOperation(operation)
    } else if (action === 'duplicate') {
      operationStore.copyOperation(operation)
    } else if (action === 'delete') {
      operationStore.removeOperation(operation)
    }
    onDialogCancel()
  })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog :title="categoryName" @dismiss="onDialogCancel">
      <div class="category-ops">
        <div class="category-ops__period">{{ periodLabel }}</div>
        <div v-if="loading" class="ds-empty">Carregando...</div>
        <div v-else-if="operations.length === 0" class="ds-empty">
          Nenhuma operação neste período
        </div>
        <div v-else class="category-ops__list">
          <OperationListItem
            v-for="operation in operations"
            :key="operation.id"
            :icon="categoryIcon(operation.category.name)"
            :title="operation.description || 'Não identificada'"
            :meta="meta(operation)"
            :value-in-cents="operation.valueInCents"
            @click="openDetails(operation)"
          />
        </div>
      </div>
    </BottomSheetDialog>
  </q-dialog>
</template>

<style lang="scss" scoped>
.category-ops {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 60vh;
}

.category-ops__period {
  font-size: 12.5px;
  color: var(--ds-muted);
}

.category-ops__list {
  overflow-y: auto;
  border-radius: 14px;
  border: 1px solid var(--ds-line);
}
</style>

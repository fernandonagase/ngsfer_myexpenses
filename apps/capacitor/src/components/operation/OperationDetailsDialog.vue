<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { getWeekdayName } from '@ngsfer-myexpenses/utils'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import type { Operation } from 'src/databases/entities/expenses'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { useOperationStore } from 'src/stores/operation-store'

export type OperationDetailsAction = 'edit' | 'duplicate' | 'move' | 'delete'

const props = defineProps<{
  operation: Operation
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const operationStore = useOperationStore()

const title = computed(() => props.operation.description || 'Não identificada')

const centerName = computed(
  () => props.operation.center?.name ?? operationStore.center?.name ?? '—',
)

const isFuture = computed(() => props.operation.date > dayjs().format('YYYY-MM-DD'))

const weekdayLabel = computed(() => {
  const day = dayjs(props.operation.date).day() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  return getWeekdayName(day)
})

const recurrenceLabel = computed(() => {
  const rule = props.operation.recurringRule
  if (!rule) return null

  if (rule.frequency === FrequencyType.WEEKLY && rule.weeklyAnchorDay != null) {
    return `Repete toda(o) ${getWeekdayName(rule.weeklyAnchorDay)}`
  }
  if (rule.frequency === FrequencyType.MONTHLY) {
    return `Repete todo dia ${rule.anchorDay}`
  }
  if (rule.frequency === FrequencyType.YEARLY) {
    return `Repete todo ano`
  }
  return 'Recorrente'
})

const notificationLabel = computed(() => {
  if (!props.operation.notificationEnabled) return null

  const days = props.operation.notificationDaysBefore
  const time = props.operation.notificationTime
  const daysPart =
    days == null ? 'Lembrete ativo' : days === 0 ? 'No dia' : `${days} dia(s) antes`
  const timePart = time ? ` às ${time}` : ''
  return `${daysPart}${timePart}`
})

function selectAction(action: OperationDetailsAction) {
  onDialogOK(action)
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog :title="title">
      <template #header-side>
        <q-btn icon="more_vert" size="12px" flat dense round>
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="selectAction('edit')">
                <q-item-section>Alterar</q-item-section>
                <q-item-section side>
                  <q-icon name="edit" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="selectAction('duplicate')">
                <q-item-section>Duplicar</q-item-section>
                <q-item-section side>
                  <q-icon name="content_copy" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="selectAction('move')">
                <q-item-section>Mover</q-item-section>
                <q-item-section side>
                  <q-icon name="move_up" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="selectAction('delete')">
                <q-item-section class="text-negative">Excluir</q-item-section>
                <q-item-section side>
                  <q-icon name="delete" size="xs" color="negative" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </template>

      <div class="column q-gutter-md">
        <div class="column items-center q-mb-sm">
          <ConcealableValue>
            <div
              class="text-h5 text-weight-medium"
              :class="operation.isExpense ? 'text-black' : 'text-positive'"
            >
              {{ operation.isExpense ? '' : '+' }}{{ operation.valueString }}
            </div>
          </ConcealableValue>
          <div class="text-caption text-grey-7">
            {{ operation.isExpense ? 'Saída' : 'Entrada' }}
          </div>
        </div>

        <q-list bordered separator class="rounded-borders">
          <q-item>
            <q-item-section avatar>
              <q-icon name="category" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Categoria</q-item-label>
              <q-item-label>{{ operation.category.name }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="event" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Data</q-item-label>
              <q-item-label>
                {{ operation.dateString }}
                <span class="text-grey-7">· {{ weekdayLabel }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section v-if="isFuture" side>
              <q-badge color="primary" outline>Agendada</q-badge>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="account_balance_wallet" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Centro financeiro</q-item-label>
              <q-item-label>{{ centerName }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="operation.notes">
            <q-item-section avatar>
              <q-icon name="notes" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Observações</q-item-label>
              <q-item-label class="notes-text">{{ operation.notes }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="recurrenceLabel">
            <q-item-section avatar>
              <q-icon name="repeat" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Recorrência</q-item-label>
              <q-item-label>{{ recurrenceLabel }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="notificationLabel">
            <q-item-section avatar>
              <q-icon name="notifications" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Lembrete</q-item-label>
              <q-item-label>{{ notificationLabel }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </BottomSheetDialog>
  </q-dialog>
</template>

<style lang="scss" scoped>
.notes-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>

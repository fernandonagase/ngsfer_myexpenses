<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'
import { useRouter } from 'vue-router'
import { getWeekdayName } from '@ngsfer-myexpenses/utils'

import ConcealableValue from 'src/components/ConcealableValue.vue'
import { useSheetDrag } from 'src/composables/useSheetDrag'
import type { Operation } from 'src/databases/entities/expenses'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { categoryIcon } from 'src/helpers/category-icons'
import { NONE_LABEL } from 'src/models/center-scope'
import { useCenterStore } from 'src/stores/center-store'

export type OperationDetailsAction = 'edit' | 'duplicate' | 'move' | 'delete'

type DetailRow = {
  key: string
  icon: string
  label: string
  value: string
}

const props = defineProps<{
  operation: Operation
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
const router = useRouter()
const centerStore = useCenterStore()

const { translateY, isDragging, onPointerDown, onPointerMove, onPointerUp } =
  useSheetDrag(onDialogCancel)

const hasDescription = computed(() => !!props.operation.description)
const title = computed(() => props.operation.description || 'Sem descrição')

const isInvoicePayment = computed(() => props.operation.isInvoicePayment)
const isReadOnly = computed(() => props.operation.isLockedByInvoice || isInvoicePayment.value)

const cardName = computed(() => props.operation.cardInvoice?.creditCard?.name ?? null)

const centerName = computed(() => props.operation.center?.name ?? NONE_LABEL)

const isIncome = computed(() => !props.operation.isExpense)

const isFuture = computed(() => props.operation.date > dayjs().format('YYYY-MM-DD'))

const valueText = computed(
  () => `${isIncome.value ? '+' : ''}${props.operation.valueString}`,
)

const weekdayLabel = computed(() => {
  const day = dayjs(props.operation.date).day()
  return getWeekdayName(day)
})

const recurrenceLabel = computed(() => {
  const rule = props.operation.recurringRule
  if (!rule) return null

  if (rule.frequency === FrequencyType.WEEKLY && rule.weeklyAnchorDay != null) {
    return `Toda(o) ${getWeekdayName(rule.weeklyAnchorDay)}`
  }
  if (rule.frequency === FrequencyType.MONTHLY) {
    return `Todo dia ${rule.anchorDay}`
  }
  if (rule.frequency === FrequencyType.YEARLY) {
    return 'Todo ano'
  }
  return 'Recorrente'
})

const notificationLabel = computed(() => {
  if (!props.operation.notificationEnabled) return null

  const days = props.operation.notificationDaysBefore
  const time = props.operation.notificationTime
  const daysPart = days == null ? 'Lembrete ativo' : days === 0 ? 'No dia' : `${days} dia(s) antes`
  const timePart = time ? ` às ${time}` : ''
  return `${daysPart}${timePart}`
})

const rows = computed<DetailRow[]>(() => {
  const list: DetailRow[] = [
    {
      key: 'category',
      icon: 'sell',
      label: 'Categoria',
      value: props.operation.category.name,
    },
    {
      key: 'date',
      icon: 'event',
      label: 'Data',
      value: `${props.operation.dateString} · ${weekdayLabel.value}`,
    },
  ]

  if (cardName.value) {
    list.push({ key: 'card', icon: 'credit_card', label: 'Cartão', value: cardName.value })
  }
  if (centerStore.hasActiveCenters) {
    list.push({
      key: 'center',
      icon: 'account_balance_wallet',
      label: 'Centro',
      value: centerName.value,
    })
  }
  if (recurrenceLabel.value) {
    list.push({
      key: 'recurrence',
      icon: 'event_repeat',
      label: 'Repetição',
      value: recurrenceLabel.value,
    })
  }
  if (notificationLabel.value) {
    list.push({
      key: 'notification',
      icon: 'notifications',
      label: 'Lembrete',
      value: notificationLabel.value,
    })
  }

  return list
})

function selectAction(action: OperationDetailsAction) {
  onDialogOK(action)
}

function goToInvoice() {
  const cardId = props.operation.cardInvoice?.creditCard?.id
  onDialogCancel()
  void router.push(cardId != null ? { name: 'invoices', query: { cardId } } : { name: 'invoices' })
}
</script>

<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card
      class="q-dialog-plugin op-sheet"
      :class="{ 'op-sheet--dragging': isDragging }"
      :style="{ transform: `translateY(${translateY}px)` }"
    >
      <div
        class="op-sheet__handle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="op-sheet__handle-bar"></div>
      </div>

      <div class="op-sheet__scroll">
        <div class="op-sheet__head">
          <div class="ds-avatar op-sheet__avatar" :class="isIncome ? 'ds-avatar--income' : 'ds-avatar--neutral'">
            <q-icon :name="isInvoicePayment ? 'credit_card' : categoryIcon(operation.category.name)" size="24px" />
          </div>
          <div class="op-sheet__headings">
            <div class="op-sheet__badges">
              <span class="ds-badge ds-badge--tag" :class="isIncome ? 'ds-badge--income' : 'ds-badge--neutral'">
                {{ isIncome ? 'Entrada' : 'Saída' }}
              </span>
              <span
                class="ds-badge ds-badge--tag"
                :class="isFuture ? 'op-sheet__badge--scheduled' : 'ds-badge--neutral'"
              >
                {{ isFuture ? 'Agendada' : 'Confirmada' }}
              </span>
            </div>
            <div class="op-sheet__title" :class="{ 'op-sheet__title--empty': !hasDescription }">
              {{ title }}
            </div>
          </div>
          <button type="button" class="op-sheet__close" aria-label="Fechar" @click="onDialogCancel">
            <q-icon name="close" size="20px" />
          </button>
        </div>

        <ConcealableValue concealed-class="op-sheet__value">
          <div class="op-sheet__value" :class="{ 'op-sheet__value--income': isIncome }">
            {{ valueText }}
          </div>
        </ConcealableValue>

        <div v-if="isInvoicePayment" class="op-sheet__notice">
          <q-icon name="lock" size="20px" class="op-sheet__notice-icon" />
          <div class="op-sheet__notice-body">
            Pagamento de fatura — somente leitura. Para desfazer, estorne o pagamento na tela de
            Faturas.
            <button type="button" class="op-sheet__notice-link" @click="goToInvoice">
              Ir para a fatura
            </button>
          </div>
        </div>
        <div v-else-if="isReadOnly" class="op-sheet__notice">
          <q-icon name="lock" size="20px" class="op-sheet__notice-icon" />
          <div class="op-sheet__notice-body">
            Compra em fatura fechada. Reabra a fatura para editar.
          </div>
        </div>

        <button
          v-if="!hasDescription && !isReadOnly"
          type="button"
          class="op-sheet__hint"
          @click="selectAction('edit')"
        >
          <q-icon name="edit_note" size="20px" class="op-sheet__hint-icon" />
          <span class="op-sheet__hint-text">
            Esta operação não tem descrição. <strong>Dar um nome</strong> facilita achá-la depois na
            busca.
          </span>
        </button>

        <div class="op-sheet__rows">
          <div v-for="row in rows" :key="row.key" class="op-sheet__row">
            <q-icon :name="row.icon" size="19px" class="op-sheet__row-icon" />
            <div class="op-sheet__row-label">{{ row.label }}</div>
            <div class="op-sheet__row-value">{{ row.value }}</div>
          </div>
        </div>

        <div v-if="operation.notes" class="op-sheet__note">
          <div class="op-sheet__note-label">Observação</div>
          <div class="op-sheet__note-text">{{ operation.notes }}</div>
        </div>
      </div>

      <div v-if="!isReadOnly" class="op-sheet__actions">
        <button
          type="button"
          class="ds-block-btn ds-block-btn--outline op-sheet__action"
          @click="selectAction('edit')"
        >
          <q-icon name="edit" size="19px" />
          Editar
        </button>
        <button
          type="button"
          class="ds-block-btn ds-block-btn--outline op-sheet__action"
          @click="selectAction('duplicate')"
        >
          <q-icon name="content_copy" size="19px" />
          Duplicar
        </button>
        <button
          v-if="centerStore.hasActiveCenters"
          type="button"
          class="ds-block-btn ds-block-btn--outline op-sheet__icon-action"
          aria-label="Mover"
          @click="selectAction('move')"
        >
          <q-icon name="move_up" size="20px" />
        </button>
        <button
          type="button"
          class="ds-block-btn op-sheet__icon-action op-sheet__icon-action--danger"
          aria-label="Excluir"
          @click="selectAction('delete')"
        >
          <q-icon name="delete" size="20px" />
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<style lang="scss" scoped>
.op-sheet {
  border-radius: 22px 22px 0 0;
  display: flex;
  flex-direction: column;
  max-height: 86vh;
  transition: transform 0.2s ease-out;

  &--dragging {
    transition: none;
  }
}

.op-sheet__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  flex-shrink: 0;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.op-sheet__handle-bar {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #dcdcdc;
}

.op-sheet__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 6px 20px 4px;
}

.op-sheet__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.op-sheet__avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
}

.op-sheet__headings {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.op-sheet__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.op-sheet__badge--scheduled {
  color: #8a5a10;
  background: #fdf3e3;
}

.op-sheet__title {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.01em;
  color: var(--ds-ink);
  overflow-wrap: anywhere;
}

.op-sheet__title--empty {
  color: var(--ds-faint);
}

.op-sheet__close {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #8a978f;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:active {
    background: var(--ds-neutral-soft);
  }
}

.op-sheet__value {
  font-size: 38px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.025em;
  color: var(--ds-ink);
}

.op-sheet__value--income {
  color: var(--ds-income);
}

.op-sheet__notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fdf3e3;
  color: #8a5a10;
  font-size: 13px;
  line-height: 1.45;
}

.op-sheet__notice-icon {
  flex-shrink: 0;
}

.op-sheet__notice-body {
  flex: 1;
  min-width: 0;
}

.op-sheet__notice-link {
  display: block;
  margin-top: 4px;
  padding: 0;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: #8a5a10;
  text-decoration: underline;
  cursor: pointer;
}

.op-sheet__hint {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px dashed #b9cbc2;
  border-radius: 14px;
  padding: 12px 14px;
  background: #f3f7f5;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.op-sheet__hint-icon {
  flex-shrink: 0;
  color: var(--ds-accent);
}

.op-sheet__hint-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.45;
  color: #4b5a55;

  strong {
    color: var(--ds-accent);
  }
}

.op-sheet__rows {
  border-radius: 16px;
  background: #f7f9f8;
  overflow: hidden;
}

.op-sheet__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;

  & + & {
    border-top: 1px solid #eef1f0;
  }
}

.op-sheet__row-icon {
  flex-shrink: 0;
  color: #8a978f;
}

.op-sheet__row-label {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a978f;
}

.op-sheet__row-value {
  max-width: 62%;
  font-size: 14px;
  font-weight: 500;
  color: var(--ds-ink);
  text-align: right;
  overflow-wrap: anywhere;
}

.op-sheet__note {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.op-sheet__note-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #8a978f;
}

.op-sheet__note-text {
  font-size: 13.5px;
  line-height: 1.5;
  color: #4b5a55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.op-sheet__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  padding: 14px 20px 22px;
  border-top: 1px solid #eef1f0;
}

.op-sheet__action {
  flex: 1;
  gap: 7px;
  padding: 13px 0;
  border-radius: 14px;
  color: var(--ds-ink);
  font-weight: 700;
}

.op-sheet__icon-action {
  width: 50px;
  flex-shrink: 0;
  padding: 13px 0;
  border-radius: 14px;
}

.op-sheet__icon-action--danger {
  border-color: #f0d9d7;
  background: transparent;
  color: var(--ds-expense);
}
</style>

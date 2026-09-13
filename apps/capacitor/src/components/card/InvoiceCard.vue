<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { BRL } from '@plumifin/utils'

import ConcealableValue from 'src/components/ConcealableValue.vue'
import OperationListItem from 'src/components/operation/OperationListItem.vue'
import type { CardInvoice, Operation } from 'src/databases/entities/expenses'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'
import { NONE_LABEL } from 'src/models/center-scope'
import { categoryIcon } from 'src/helpers/category-icons'
import {
  useInvoiceStore,
  type InvoiceCenterShare,
  type InvoiceStats,
} from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'
import { useCenterStore } from 'src/stores/center-store'
import InvoicePaymentDialog from 'src/components/card/InvoicePaymentDialog.vue'
import OperationDetailsDialog, {
  type OperationDetailsAction,
} from 'src/components/operation/OperationDetailsDialog.vue'

const props = defineProps<{
  invoice: CardInvoice
  stats: InvoiceStats
  variant: 'payable' | 'open' | 'history'
}>()

const $q = useQuasar()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()
const centerStore = useCenterStore()

const SHARE_COLORS = ['#3a5a40', '#26a69a', '#90a09a', '#c99a8f', '#6b6c6a']

const breakdown = ref<InvoiceCenterShare[]>([])
const operations = ref<Operation[]>([])
const loading = ref(true)
// Aberta: compras sempre visíveis. A pagar e histórico: recolhidas até o toque.
const expanded = ref(props.variant === 'open')

const fmt = (cents: number) => BRL(Math.abs(cents) / 100).format()

const monthLabel = computed(() => {
  const label = dayjs(`${props.invoice.referenceMonth}-01`).format('MMMM [de] YYYY')
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const dueShort = computed(() => dayjs(props.invoice.dueDate).format('DD/MM'))

const purchasesLabel = computed(
  () => `${props.stats.count} ${props.stats.count === 1 ? 'compra' : 'compras'}`,
)

const dueInLabel = computed(() => {
  const days = dayjs(props.invoice.dueDate).startOf('day').diff(dayjs().startOf('day'), 'day')
  if (days === 0) return 'vence hoje'
  if (days === 1) return 'vence amanhã'
  if (days > 1) return `vence em ${days} dias`
  if (days === -1) return 'venceu ontem'
  return `venceu há ${-days} dias`
})

const isOverdue = computed(() => dayjs(props.invoice.dueDate).isBefore(dayjs(), 'day'))

const historyMeta = computed(() => {
  if (props.invoice.status === InvoiceStatus.PAGA) {
    return props.invoice.paymentDate
      ? `Paga em ${dayjs(props.invoice.paymentDate).format('DD/MM')}`
      : 'Paga'
  }
  return 'Fechada sem compras'
})

const shares = computed(() => {
  const total = breakdown.value.reduce((sum, share) => sum + Math.abs(share.valueInCents), 0)
  return breakdown.value.map((share, index) => ({
    key: share.centerId ?? 'none',
    name: share.centerName ?? NONE_LABEL,
    text: fmt(share.valueInCents),
    pct: total ? (Math.abs(share.valueInCents) / total) * 100 : 0,
    color: SHARE_COLORS[index % SHARE_COLORS.length]!,
  }))
})

const showShares = computed(
  () => centerStore.hasActiveCenters && shares.value.length > 0 && props.variant !== 'history',
)

async function load() {
  loading.value = true
  try {
    ;[breakdown.value, operations.value] = await Promise.all([
      invoiceStore.getInvoiceBreakdownByCenter(props.invoice.id),
      invoiceStore.getInvoiceOperations(props.invoice.id),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(
  () => operationStore.dataRevision,
  () => {
    void load()
  },
)

function purchaseMeta(operation: Operation) {
  const parts = [dayjs(operation.date).format('DD/MM'), operation.category.name]
  if (centerStore.hasActiveCenters) parts.push(operation.center?.name ?? NONE_LABEL)
  return parts.join(' · ')
}

function openPurchaseDetails(operation: Operation) {
  $q.dialog({
    component: OperationDetailsDialog,
    componentProps: { operation },
  }).onOk((action: OperationDetailsAction) => {
    if (action === 'edit') {
      operationStore.editOperation(operation)
    } else if (action === 'delete') {
      operationStore.removeOperation(operation)
    }
  })
}

function onPay() {
  if (breakdown.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Esta fatura não possui compras para pagar.' })
    return
  }
  $q.dialog({
    component: InvoicePaymentDialog,
    componentProps: {
      invoice: props.invoice,
      shares: breakdown.value,
    },
  }).onOk((payload: { paymentDate: string; shares: InvoiceCenterShare[] }) => {
    void invoiceStore.payInvoice(props.invoice, payload).then((ok) => {
      if (ok) void load()
    })
  })
}

function onReopenPayment() {
  invoiceStore.reopenInvoicePayment(props.invoice)
}

function onReopenForEditing() {
  invoiceStore.reopenInvoiceForEditing(props.invoice)
}

function onCloseEarly() {
  invoiceStore.closeInvoiceEarly(props.invoice)
}
</script>

<template>
  <!-- Histórico: linha compacta expansível -->
  <div v-if="variant === 'history'" class="history-item">
    <div class="ds-row ds-row--clickable history-item__row" @click="expanded = !expanded">
      <q-icon
        :name="invoice.status === InvoiceStatus.PAGA ? 'check_circle' : 'remove_circle_outline'"
        size="20px"
        :class="
          invoice.status === InvoiceStatus.PAGA
            ? 'history-item__icon--paid'
            : 'history-item__icon--empty'
        "
      />
      <div class="ds-row__body">
        <div class="history-item__title">{{ monthLabel }}</div>
        <div class="ds-row__meta">{{ historyMeta }}</div>
      </div>
      <ConcealableValue concealed-class="history-item__value">
        <div class="history-item__value">
          {{ stats.totalInCents ? fmt(stats.totalInCents) : '—' }}
        </div>
      </ConcealableValue>
    </div>
    <div v-if="expanded" class="history-item__details">
      <div v-if="loading" class="ds-empty">Carregando...</div>
      <template v-else>
        <OperationListItem
          v-for="operation in operations"
          :key="operation.id"
          :icon="categoryIcon(operation.category.name)"
          :title="operation.description || 'Não identificada'"
          :meta="purchaseMeta(operation)"
          :value-in-cents="operation.valueInCents"
          absolute
          @click="openPurchaseDetails(operation)"
        />
        <div v-if="operations.length === 0" class="ds-empty">Nenhuma compra nesta fatura.</div>
        <div class="invoice-card__actions invoice-card__actions--history">
          <button
            v-if="invoice.status === InvoiceStatus.PAGA"
            type="button"
            class="ds-block-btn ds-block-btn--outline invoice-card__danger"
            @click="onReopenPayment"
          >
            <q-icon name="undo" size="18px" />
            Estornar pagamento
          </button>
          <button
            v-else
            type="button"
            class="ds-block-btn ds-block-btn--outline"
            @click="onReopenForEditing"
          >
            <q-icon name="edit" size="18px" />
            Reabrir
          </button>
        </div>
      </template>
    </div>
  </div>

  <!-- A pagar / Aberta: card completo -->
  <section v-else class="ds-card invoice-card">
    <div
      class="invoice-card__head"
      :class="{ 'invoice-card__head--clickable': variant === 'payable' }"
      @click="variant === 'payable' && (expanded = !expanded)"
    >
      <div class="invoice-card__head-text">
        <div class="invoice-card__status">
          <template v-if="variant === 'payable'">
            <span class="invoice-card__status-label invoice-card__status-label--payable"
              >A pagar</span
            >
            <span class="ds-badge ds-badge--expense">{{ dueInLabel }}</span>
          </template>
          <template v-else>
            <span class="invoice-card__status-label invoice-card__status-label--open">Aberta</span>
            <span class="invoice-card__dot"></span>
          </template>
        </div>
        <div class="invoice-card__month">{{ monthLabel }}</div>
        <div class="invoice-card__meta">
          <span :class="{ 'invoice-card__meta--overdue': variant === 'payable' && isOverdue }">
            Vence em {{ dueShort }}
          </span>
          · {{ purchasesLabel }}
        </div>
      </div>

      <ConcealableValue v-if="variant === 'payable'" concealed-class="invoice-card__total">
        <div class="invoice-card__total">{{ fmt(stats.totalInCents) }}</div>
      </ConcealableValue>
      <button v-else type="button" class="invoice-card__close-btn" @click.stop="onCloseEarly">
        <q-icon name="lock" size="16px" />
        Fechar agora
      </button>
    </div>

    <div v-if="variant === 'payable'" class="invoice-card__actions">
      <button
        type="button"
        class="ds-block-btn ds-block-btn--primary ds-block-btn--grow"
        @click="onPay"
      >
        Pagar fatura
      </button>
      <button
        type="button"
        class="ds-block-btn ds-block-btn--outline invoice-card__reopen"
        @click="onReopenForEditing"
      >
        <q-icon name="edit" size="18px" />
        Reabrir
      </button>
    </div>

    <div v-if="showShares && !loading" class="invoice-card__shares">
      <div class="invoice-card__shares-bar" aria-hidden="true">
        <div
          v-for="share in shares"
          :key="share.key"
          :style="{ width: `${share.pct}%`, background: share.color }"
        ></div>
      </div>
      <div class="invoice-card__legend">
        <div v-for="share in shares" :key="share.key" class="invoice-card__legend-item">
          <span class="invoice-card__legend-dot" :style="{ background: share.color }"></span>
          {{ share.name }}
          <ConcealableValue concealed-class="invoice-card__legend-value">
            <span class="invoice-card__legend-value">{{ share.text }}</span>
          </ConcealableValue>
        </div>
      </div>
    </div>

    <div v-if="expanded" class="invoice-card__purchases">
      <div v-if="loading" class="ds-empty">Carregando...</div>
      <template v-else>
        <OperationListItem
          v-for="operation in operations"
          :key="operation.id"
          :icon="categoryIcon(operation.category.name)"
          :title="operation.description || 'Não identificada'"
          :meta="purchaseMeta(operation)"
          :value-in-cents="operation.valueInCents"
          absolute
          @click="openPurchaseDetails(operation)"
        />
        <div v-if="operations.length === 0" class="ds-empty">Nenhuma compra nesta fatura.</div>
      </template>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.invoice-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.invoice-card__head {
  padding: 16px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.invoice-card__head--clickable {
  cursor: pointer;
  user-select: none;
}

.invoice-card__head-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.invoice-card__status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-card__status-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.invoice-card__status-label--payable {
  color: var(--ds-expense);
}

.invoice-card__status-label--open {
  color: var(--ds-accent);
}

.invoice-card__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ds-income);
}

.invoice-card__month {
  font-size: 16px;
  font-weight: 700;
  color: var(--ds-ink);
}

.invoice-card__meta {
  font-size: 12.5px;
  color: var(--ds-muted);
}

.invoice-card__meta--overdue {
  color: var(--ds-expense);
  font-weight: 500;
}

.invoice-card__total {
  font-size: 22px;
  font-weight: 700;
  color: var(--ds-ink);
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.invoice-card__close-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border: 1px solid var(--ds-border);
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: #5c6b66;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.invoice-card__actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px;
}

.invoice-card__actions--history {
  padding: 8px 12px 12px;
  justify-content: flex-end;
}

.invoice-card__reopen {
  color: var(--ds-accent);
}

.invoice-card__danger {
  color: var(--ds-expense);
}

.invoice-card__shares {
  margin: 0 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.invoice-card__shares-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  gap: 2px;

  > div {
    border-radius: 3px;
    min-width: 2px;
  }
}

.invoice-card__legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.invoice-card__legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ds-muted);
}

.invoice-card__legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.invoice-card__legend-value {
  font-weight: 700;
  color: var(--ds-ink);
}

.invoice-card__purchases {
  border-top: 1px solid var(--ds-line);
}

.history-item + .history-item {
  border-top: 1px solid var(--ds-line);
}

.history-item__row {
  padding: 12px 16px;
}

.history-item__icon--paid {
  color: var(--ds-income);
}

.history-item__icon--empty {
  color: var(--ds-hairline);
}

.history-item__title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ds-ink);
}

.history-item__value {
  font-size: 14px;
  font-weight: 500;
  color: var(--ds-muted);
}

.history-item__details {
  background: #fafbfa;
  border-top: 1px solid var(--ds-line);
}
</style>

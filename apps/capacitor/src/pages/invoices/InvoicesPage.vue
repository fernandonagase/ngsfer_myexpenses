<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import { BRL } from '@plumifin/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import HeaderChips, { type HeaderChip } from 'src/components/shell/HeaderChips.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import EmptyList from 'src/components/EmptyList.vue'
import InvoiceCard from 'src/components/card/InvoiceCard.vue'
import type { CardInvoice } from 'src/databases/entities/expenses'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'
import { useCardStore } from 'src/stores/card-store'
import { useInvoiceStore, type InvoiceStats } from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'

const route = useRoute()
const cardStore = useCardStore()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()

const selectedCardId = ref<string | undefined>(undefined)
const loading = ref(false)
const statsByInvoice = ref<Record<number, InvoiceStats>>({})
const showHistory = ref(false)

const selectedCard = computed(
  () => cardStore.cards.find((card) => String(card.id) === selectedCardId.value) ?? null,
)

const cardChips = computed<HeaderChip<string>[]>(() =>
  cardStore.cards
    .filter((card) => card.isActive || String(card.id) === selectedCardId.value)
    .map((card) => ({ value: String(card.id), label: card.name, icon: 'credit_card' })),
)

function statsOf(invoice: CardInvoice): InvoiceStats {
  return statsByInvoice.value[invoice.id] ?? { totalInCents: 0, count: 0 }
}

const openInvoices = computed(() =>
  invoiceStore.invoices.filter((invoice) => invoice.status === InvoiceStatus.ABERTA),
)

const payableInvoices = computed(() =>
  invoiceStore.invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.FECHADA && statsOf(invoice).totalInCents !== 0,
  ),
)

const historyInvoices = computed(() =>
  invoiceStore.invoices.filter(
    (invoice) =>
      invoice.status === InvoiceStatus.PAGA ||
      (invoice.status === InvoiceStatus.FECHADA && statsOf(invoice).totalInCents === 0),
  ),
)

/** Fatura aberta mais próxima de fechar (herói do cabeçalho). */
const heroInvoice = computed(() => {
  const sorted = [...openInvoices.value].sort((a, b) => a.closingDate.localeCompare(b.closingDate))
  return sorted[0] ?? null
})

const heroCaption = computed(() => {
  if (!selectedCard.value) return 'Nenhum cartão cadastrado'
  if (!heroInvoice.value) return 'Sem fatura aberta'
  return `Fatura aberta · fecha em ${dayjs(heroInvoice.value.closingDate).format('DD/MM')}`
})

const heroText = computed(() =>
  heroInvoice.value ? BRL(Math.abs(statsOf(heroInvoice.value).totalInCents) / 100).format() : '—',
)

async function loadInvoices() {
  if (!selectedCard.value) {
    invoiceStore.invoices = []
    statsByInvoice.value = {}
    return
  }
  loading.value = true
  try {
    await invoiceStore.fetchInvoicesByCard(selectedCard.value.id)
    statsByInvoice.value = await invoiceStore.getInvoiceStats(selectedCard.value.id)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await cardStore.fetchCards()
  const requestedId = Number(route.query.cardId)
  const initial =
    cardStore.cards.find((card) => card.id === requestedId) ??
    cardStore.activeCards[0] ??
    cardStore.cards[0] ??
    null
  selectedCardId.value = initial ? String(initial.id) : undefined
  await loadInvoices()
})

watch(selectedCardId, () => {
  void loadInvoices()
})

watch(
  () => operationStore.dataRevision,
  async () => {
    await cardStore.fetchCards()
    if (!selectedCardId.value && cardStore.activeCards[0]) {
      selectedCardId.value = String(cardStore.activeCards[0].id)
      return
    }
    await loadInvoices()
  },
)
</script>

<template>
  <q-page class="invoices-page">
    <ScreenHeader title="Faturas" back>
      <template #chips>
        <HeaderChips v-model="selectedCardId" :options="cardChips">
          <button type="button" class="add-card-chip" @click="cardStore.addCard()">
            <q-icon name="add" size="17px" />
            Cartão
          </button>
        </HeaderChips>
      </template>
      <template #hero>
        <div class="screen-header__caption">{{ heroCaption }}</div>
        <ConcealableValue concealed-class="screen-header__value">
          <div class="screen-header__value">{{ heroText }}</div>
        </ConcealableValue>
      </template>
    </ScreenHeader>

    <ScreenBody bottom-padding="32px">
      <ErrorBoundary>
        <div v-if="loading" class="ds-card ds-empty">Carregando faturas...</div>

        <template v-else>
          <div v-if="cardStore.cards.length === 0" class="ds-card invoices-empty">
            <EmptyList label="Nenhum cartão cadastrado" />
          </div>
          <div v-else-if="invoiceStore.invoices.length === 0" class="ds-card invoices-empty">
            <EmptyList label="Nenhuma fatura para este cartão" />
          </div>

          <template v-else>
            <InvoiceCard
              v-for="invoice in payableInvoices"
              :key="invoice.id"
              :invoice="invoice"
              :stats="statsOf(invoice)"
              variant="payable"
            />

            <InvoiceCard
              v-for="invoice in openInvoices"
              :key="invoice.id"
              :invoice="invoice"
              :stats="statsOf(invoice)"
              variant="open"
            />

            <template v-if="historyInvoices.length > 0">
              <div class="history-toggle" @click="showHistory = !showHistory">
                <span class="ds-section-label">Histórico</span>
                <q-icon
                  :name="showHistory ? 'expand_less' : 'expand_more'"
                  size="20px"
                  class="history-toggle__caret"
                />
              </div>
              <div v-if="showHistory" class="ds-card ds-card--flat history">
                <InvoiceCard
                  v-for="invoice in historyInvoices"
                  :key="invoice.id"
                  :invoice="invoice"
                  :stats="statsOf(invoice)"
                  variant="history"
                />
              </div>
            </template>
          </template>
        </template>
      </ErrorBoundary>
    </ScreenBody>
  </q-page>
</template>

<style lang="scss" scoped>
.invoices-page {
  background: var(--ds-surface);
}

.add-card-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border: 1px dashed rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #fff;
}

.invoices-empty {
  padding: 24px 16px;
}

.history-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  cursor: pointer;
  user-select: none;
}

.history-toggle__caret {
  color: var(--ds-faint);
}

.history {
  margin-top: -8px;
  overflow: hidden;
}
</style>

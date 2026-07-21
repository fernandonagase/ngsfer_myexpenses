<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import EmptyList from 'src/components/EmptyList.vue'
import InvoiceCard from 'src/components/card/InvoiceCard.vue'
import type { CardInvoice, CreditCard } from 'src/databases/entities/expenses'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'
import { useCardStore } from 'src/stores/card-store'
import { useInvoiceStore } from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'

const route = useRoute()
const cardStore = useCardStore()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()

const selectedCard = ref<CreditCard | null>(null)
const loading = ref(false)
const totalsByInvoice = ref<Record<number, number>>({})

function invoiceTotal(invoice: CardInvoice): number {
  return totalsByInvoice.value[invoice.id] ?? 0
}

const openInvoices = computed(() =>
  invoiceStore.invoices.filter((invoice) => invoice.status === InvoiceStatus.ABERTA),
)

const payableInvoices = computed(() =>
  invoiceStore.invoices.filter(
    (invoice) => invoice.status === InvoiceStatus.FECHADA && invoiceTotal(invoice) !== 0,
  ),
)

const historyInvoices = computed(() =>
  invoiceStore.invoices.filter(
    (invoice) =>
      invoice.status === InvoiceStatus.PAGA ||
      (invoice.status === InvoiceStatus.FECHADA && invoiceTotal(invoice) === 0),
  ),
)

async function loadInvoices() {
  if (!selectedCard.value) {
    invoiceStore.invoices = []
    totalsByInvoice.value = {}
    return
  }
  loading.value = true
  try {
    await invoiceStore.fetchInvoicesByCard(selectedCard.value.id)
    totalsByInvoice.value = await invoiceStore.getInvoiceTotalsByCard(selectedCard.value.id)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await cardStore.fetchCards()
  const requestedId = Number(route.query.cardId)
  selectedCard.value =
    cardStore.cards.find((card) => card.id === requestedId) ?? cardStore.cards[0] ?? null
  await loadInvoices()
})

watch(selectedCard, () => {
  void loadInvoices()
})

watch(
  () => operationStore.dataRevision,
  () => {
    void loadInvoices()
  },
)
</script>

<template>
  <q-page class="q-pa-md">
    <ErrorBoundary>
      <q-select
        v-if="cardStore.cards.length > 0"
        v-model="selectedCard"
        :options="cardStore.cards"
        label="Cartão"
        option-label="name"
        outlined
        class="q-mb-md"
      />

      <div v-if="loading" class="text-grey-7 q-mt-md">Carregando faturas...</div>

      <template v-else>
        <div v-if="cardStore.cards.length === 0" class="q-mt-xl">
          <EmptyList label="Nenhum cartão cadastrado" />
        </div>
        <div v-else-if="invoiceStore.invoices.length === 0" class="q-mt-xl">
          <EmptyList label="Nenhuma fatura para este cartão" />
        </div>
        <div v-else>
          <template v-if="openInvoices.length > 0">
            <div class="text-subtitle2 text-grey-8 q-mb-sm">Aberta</div>
            <InvoiceCard
              v-for="invoice in openInvoices"
              :key="invoice.id"
              :invoice="invoice"
            />
          </template>

          <template v-if="payableInvoices.length > 0">
            <div
              class="text-subtitle2 text-grey-8 q-mb-sm"
              :class="{ 'q-mt-md': openInvoices.length > 0 }"
            >
              A pagar
            </div>
            <InvoiceCard
              v-for="invoice in payableInvoices"
              :key="invoice.id"
              :invoice="invoice"
            />
          </template>

          <q-expansion-item
            v-if="historyInvoices.length > 0"
            label="Histórico"
            header-class="text-subtitle2 text-grey-8"
            class="q-mt-md"
            dense
          >
            <InvoiceCard
              v-for="invoice in historyInvoices"
              :key="invoice.id"
              :invoice="invoice"
            />
          </q-expansion-item>
        </div>
      </template>
    </ErrorBoundary>
  </q-page>
</template>

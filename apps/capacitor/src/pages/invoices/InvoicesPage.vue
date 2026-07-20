<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import EmptyList from 'src/components/EmptyList.vue'
import InvoiceCard from 'src/components/card/InvoiceCard.vue'
import type { CreditCard } from 'src/databases/entities/expenses'
import { useCardStore } from 'src/stores/card-store'
import { useInvoiceStore } from 'src/stores/invoice-store'

const route = useRoute()
const cardStore = useCardStore()
const invoiceStore = useInvoiceStore()

const selectedCard = ref<CreditCard | null>(null)
const loading = ref(false)

async function loadInvoices() {
  if (!selectedCard.value) {
    invoiceStore.invoices = []
    return
  }
  loading.value = true
  try {
    await invoiceStore.fetchInvoicesByCard(selectedCard.value.id)
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
          <InvoiceCard
            v-for="invoice in invoiceStore.invoices"
            :key="invoice.id"
            :invoice="invoice"
          />
        </div>
      </template>
    </ErrorBoundary>
  </q-page>
</template>

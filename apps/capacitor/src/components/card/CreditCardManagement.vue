<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BRL } from '@ngsfer-myexpenses/utils'

import type { CreditCard } from 'src/databases/entities/expenses'
import { useCardStore } from 'src/stores/card-store'

const emit = defineEmits<{ close: [] }>()

const cardStore = useCardStore()
const router = useRouter()

onMounted(async () => {
  await cardStore.fetchCards()
})

function viewInvoices(card: CreditCard) {
  emit('close')
  void router.push({ name: 'invoices', query: { cardId: card.id } })
}
</script>

<template>
  <q-list separator>
    <q-item v-for="card in cardStore.cards" :key="card.id">
      <q-item-section>
        <q-item-label>
          {{ card.name }}
          <q-badge v-if="!card.isActive" label="Inativo" color="grey-8" class="q-ml-xs" />
        </q-item-label>
        <q-item-label caption>
          Fecha dia {{ card.closingDay }} · Vence dia {{ card.dueDay }}
          <template v-if="card.limitInCents != null">
            · Limite {{ BRL(card.limitInCents / 100).format() }}
          </template>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn icon="more_vert" size="12px" flat dense round>
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="viewInvoices(card)">
                <q-item-section>Ver faturas</q-item-section>
                <q-item-section side>
                  <q-icon name="receipt_long" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="cardStore.editCard(card)">
                <q-item-section>Editar</q-item-section>
                <q-item-section side>
                  <q-icon name="edit" size="xs" />
                </q-item-section>
              </q-item>
              <q-item
                v-if="card.isActive"
                clickable
                v-close-popup
                @click="cardStore.softRemoveCard(card)"
              >
                <q-item-section>Inativar</q-item-section>
                <q-item-section side>
                  <q-icon name="block" size="xs" />
                </q-item-section>
              </q-item>
              <q-item v-else clickable v-close-popup @click="cardStore.reactivateCard(card)">
                <q-item-section>Reativar</q-item-section>
                <q-item-section side>
                  <q-icon name="check_circle" size="xs" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-item-section>
    </q-item>
    <q-item v-ripple clickable @click="cardStore.addCard()">
      <q-item-section>Novo</q-item-section>
      <q-item-section side><q-icon name="add" /></q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { BRL } from '@ngsfer-myexpenses/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import BottomCta from 'src/components/shell/BottomCta.vue'
import ActionSheetDialog, { type SheetAction } from 'src/components/ActionSheetDialog.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RegistryEmptyState from 'src/components/RegistryEmptyState.vue'
import type { CreditCard } from 'src/databases/entities/expenses'
import { useCardStore } from 'src/stores/card-store'
import { useInvoiceStore } from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'

const $q = useQuasar()
const router = useRouter()
const cardStore = useCardStore()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()

const openTotals = ref<Record<number, number>>({})

const fmt = (cents: number) => BRL(Math.abs(cents) / 100).format()

const isEmpty = computed(() => cardStore.cards.length === 0)

const heroValue = computed(() => `${cardStore.activeCards.length} de ${cardStore.cards.length}`)

function openOf(card: CreditCard) {
  return Math.abs(openTotals.value[card.id] ?? 0)
}

function usagePct(card: CreditCard) {
  if (!card.limitInCents) return 0
  return Math.min(100, Math.round((openOf(card) / card.limitInCents) * 100))
}

async function load() {
  await cardStore.fetchCards()
  openTotals.value = await invoiceStore.getOpenInvoiceTotalsByCard()
}

onMounted(load)

watch(
  () => operationStore.dataRevision,
  () => {
    void load()
  },
)

function openActions(card: CreditCard) {
  const actions: SheetAction[] = [
    { value: 'invoices', label: 'Ver faturas', icon: 'receipt_long' },
    { value: 'edit', label: 'Editar', icon: 'edit' },
    card.isActive
      ? { value: 'deactivate', label: 'Inativar', icon: 'block', danger: true }
      : { value: 'reactivate', label: 'Reativar', icon: 'check_circle' },
  ]

  $q.dialog({
    component: ActionSheetDialog,
    componentProps: {
      title: card.name,
      meta: `Fecha dia ${card.closingDay} · vence dia ${card.dueDay}`,
      actions,
    },
  }).onOk((action: string) => {
    if (action === 'invoices') {
      void router.push({ name: 'invoices', query: { cardId: card.id } })
    } else if (action === 'edit') cardStore.editCard(card)
    else if (action === 'deactivate') cardStore.softRemoveCard(card)
    else if (action === 'reactivate') cardStore.reactivateCard(card)
  })
}
</script>

<template>
  <q-page class="cards-page">
    <ScreenHeader title="Cartões de crédito" back hide-eye>
      <template #hero>
        <div class="screen-header__caption">Cartões ativos</div>
        <div class="screen-header__value">{{ heroValue }}</div>
      </template>
    </ScreenHeader>

    <ScreenBody bottom-padding="110px">
      <ErrorBoundary>
        <RegistryEmptyState
          v-if="isEmpty"
          icon="credit_card"
          title="Nenhum cartão cadastrado"
          body="Com um cartão aqui, o app acompanha a fatura aberta, o limite usado e divide compras parceladas mês a mês."
          add-label="Novo cartão"
          hint="Sem cartão, compras no crédito precisam ser lançadas como saída no dia da compra."
          @add="cardStore.addCard()"
        />

        <template v-else>
          <div
            v-for="card in cardStore.cards"
            :key="card.id"
            class="ds-card card"
            :class="{ 'card--inactive': !card.isActive }"
            @click="openActions(card)"
          >
            <div class="card__head">
              <div class="card__icon" :class="{ 'card__icon--filled': card.isActive }">
                <q-icon name="credit_card" size="22px" />
              </div>
              <div class="ds-row__body">
                <div class="card__title-row">
                  <span class="card__name">{{ card.name }}</span>
                  <span v-if="!card.isActive" class="ds-badge ds-badge--neutral ds-badge--tag">
                    Inativo
                  </span>
                </div>
                <div class="card__meta">
                  Fecha dia {{ card.closingDay }} · vence dia {{ card.dueDay }}
                </div>
              </div>
              <q-icon name="more_horiz" size="20px" class="ds-chevron" />
            </div>

            <div v-if="card.limitInCents" class="card__limit">
              <div class="card__limit-row">
                <span>
                  Fatura aberta
                  <ConcealableValue concealed-class="card__strong">
                    <strong class="card__strong">{{ fmt(openOf(card)) }}</strong>
                  </ConcealableValue>
                </span>
                <span>
                  Limite
                  <ConcealableValue>{{ fmt(card.limitInCents) }}</ConcealableValue>
                </span>
              </div>
              <div class="card__bar">
                <div
                  class="card__bar-fill"
                  :class="{ 'card__bar-fill--alert': usagePct(card) > 80 }"
                  :style="{ width: `${usagePct(card)}%` }"
                ></div>
              </div>
            </div>
            <div v-else class="card__meta">
              Fatura aberta
              <ConcealableValue concealed-class="card__strong">
                <strong class="card__strong">{{ fmt(openOf(card)) }}</strong>
              </ConcealableValue>
              · sem limite informado
            </div>
          </div>
        </template>
      </ErrorBoundary>
    </ScreenBody>

    <BottomCta v-if="!isEmpty">
      <button
        type="button"
        class="ds-block-btn ds-block-btn--primary bottom-cta__primary"
        @click="cardStore.addCard()"
      >
        <q-icon name="add" size="20px" />
        Novo cartão
      </button>
    </BottomCta>
  </q-page>
</template>

<style lang="scss" scoped>
.cards-page {
  background: var(--ds-surface);
}

.card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.card--inactive {
  opacity: 0.62;
}

.card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card__icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #eef1f0;
  color: #8a978f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card__icon--filled {
  background: var(--ds-header);
  color: #fff;
}

.card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card__name {
  font-size: 16px;
  font-weight: 700;
  color: var(--ds-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__meta {
  font-size: 12.5px;
  color: var(--ds-muted);
}

.card__strong {
  font-weight: 700;
  color: var(--ds-ink);
}

.card__limit {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card__limit-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--ds-muted);
}

.card__bar {
  height: 6px;
  border-radius: 3px;
  background: #eef1f0;
  overflow: hidden;
}

.card__bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--ds-header);
  transition: width 0.3s;
}

.card__bar-fill--alert {
  background: var(--ds-expense);
}
</style>

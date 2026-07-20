import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { BRL } from '@ngsfer-myexpenses/utils'

import { CreditCard } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import CreditCardDialog from 'src/components/card/CreditCardDialog.vue'
import CreditCardFormDialog from 'src/components/card/CreditCardFormDialog.vue'

export { getOrCreateInvoiceForPurchase } from 'src/databases/entities/expenses/card-invoice-helpers'

const cardRepository = expensesDataSource.dataSource.getRepository(CreditCard)

export type CreditCardFormPayload = {
  name: string
  closingDay: number
  dueDay: number
  limitInCents?: number | null
}

export const useCardStore = defineStore('card', () => {
  const $q = useQuasar()

  const cards = ref<Array<CreditCard>>([])

  const activeCards = computed(() => {
    return cards.value.filter((card) => card.isActive)
  })

  async function fetchCards() {
    cards.value = await cardRepository.find({ order: { id: 'ASC' } })
  }

  function showCards() {
    $q.dialog({
      component: CreditCardDialog,
      persistent: true,
    })
  }

  function openCardForm(initial?: Partial<CreditCardFormPayload> & { title?: string }) {
    return new Promise<CreditCardFormPayload | null>((resolve) => {
      $q.dialog({
        component: CreditCardFormDialog,
        componentProps: {
          title: initial?.title ?? 'Novo cartão',
          name: initial?.name ?? '',
          closingDay: initial?.closingDay ?? 1,
          dueDay: initial?.dueDay ?? 10,
          limitInCents: initial?.limitInCents ?? null,
        },
        persistent: true,
      })
        .onOk((payload: CreditCardFormPayload) => {
          resolve(payload)
        })
        .onCancel(() => {
          resolve(null)
        })
    })
  }

  function addCard() {
    void openCardForm({ title: 'Novo cartão' }).then((payload) => {
      if (!payload) return
      const card = new CreditCard()
      card.name = payload.name
      card.closingDay = payload.closingDay
      card.dueDay = payload.dueDay
      card.limitInCents = payload.limitInCents ?? null
      card.isActive = true
      cardRepository
        .save(card)
        .then(() => {
          cards.value = [...cards.value, card]
          $q.notify({
            type: 'positive',
            message: `Cartão ${card.name} cadastrado com sucesso!`,
          })
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: 'Falha ao cadastrar cartão',
            caption: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }

  function editCard(card: CreditCard) {
    void openCardForm({
      title: 'Editar cartão',
      name: card.name,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      limitInCents: card.limitInCents ?? null,
    }).then((payload) => {
      if (!payload) return
      card.name = payload.name
      card.closingDay = payload.closingDay
      card.dueDay = payload.dueDay
      card.limitInCents = payload.limitInCents ?? null
      void cardRepository
        .save(card)
        .then(() => {
          $q.notify({
            type: 'positive',
            message: `Cartão ${card.name} atualizado com sucesso!`,
          })
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: 'Falha ao atualizar cartão',
            caption: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }

  function softRemoveCard(card: CreditCard) {
    $q.dialog({
      title: 'Inativar cartão?',
      message:
        'Este cartão será inativado e não poderá receber novos lançamentos. As faturas existentes serão preservadas.',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      card.isActive = false
      cardRepository
        .save(card)
        .then(() => {
          $q.notify({
            type: 'positive',
            message: `O cartão ${card.name} foi inativado com sucesso!`,
          })
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: 'Falha ao inativar cartão',
            caption: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }

  function reactivateCard(card: CreditCard) {
    $q.dialog({
      title: 'Reativar cartão?',
      message: 'Este cartão será reativado e poderá receber novos lançamentos.',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      card.isActive = true
      cardRepository
        .save(card)
        .then(() => {
          $q.notify({
            type: 'positive',
            message: `O cartão ${card.name} foi reativado com sucesso!`,
          })
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: 'Falha ao reativar cartão',
            caption: error instanceof Error ? error.message : String(error),
          })
        })
    })
  }

  function selectCard() {
    return new Promise<CreditCard | null>((resolve) => {
      if (activeCards.value.length === 0) {
        $q.notify({
          type: 'warning',
          message: 'Nenhum cartão ativo cadastrado',
        })
        resolve(null)
        return
      }

      $q.dialog({
        title: 'Escolha o cartão',
        options: {
          type: 'radio',
          model: String(activeCards.value[0]!.id),
          items: activeCards.value.map((card) => ({
            label:
              card.limitInCents != null
                ? `${card.name} (limite ${BRL(card.limitInCents / 100).format()})`
                : card.name,
            value: String(card.id),
          })),
        },
        ok: {
          label: 'Confirmar',
        },
        cancel: {
          label: 'Cancelar',
          color: 'negative',
          flat: true,
        },
      })
        .onOk((cardId: string) => {
          const id = Number(cardId)
          resolve(activeCards.value.find((card) => card.id === id) ?? null)
        })
        .onCancel(() => {
          resolve(null)
        })
    })
  }

  return {
    cards,
    activeCards,
    fetchCards,
    showCards,
    addCard,
    editCard,
    softRemoveCard,
    reactivateCard,
    selectCard,
  }
})

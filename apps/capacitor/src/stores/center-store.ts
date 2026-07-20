import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'

import { Center, Operation } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import CenterDialog from 'src/components/center/CenterDialog.vue'
import SelectCenterDialog from 'src/components/center/SelectCenterDialog.vue'

const centerRepository = expensesDataSource.dataSource.getRepository(Center)
const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

export const useCenterStore = defineStore('center', () => {
  const $q = useQuasar()

  const centers = ref<Array<Center>>([])

  const activeCenters = computed(() => {
    return centers.value.filter((center) => center.isActive)
  })

  async function fetchCenters() {
    centers.value = await centerRepository.find()
  }

  function showCenters() {
    $q.dialog({
      component: CenterDialog,
      persistent: true,
    })
  }

  function addCenter() {
    $q.dialog({
      title: 'Novo centro financeiro',
      prompt: {
        model: '',
        type: 'text',
      },
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk((payload) => {
      const center = new Center()
      center.name = payload
      center.isDefaultCenter = false
      centerRepository
        .save(center)
        .then(() => {
          centers.value = [...centers.value, center]
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: `Falha ao cadastrar centro financeiro`,
            caption: error.message,
          })
        })
    })
  }

  function editCenter(center: Center) {
    $q.dialog({
      title: 'Centro financeiro',
      prompt: {
        model: '',
        type: 'text',
      },
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk((payload) => {
      center.name = payload
      void centerRepository.save(center)
    })
  }

  async function countOpenInvoicePurchases(centerId: number): Promise<number> {
    return operationRepository
      .createQueryBuilder('operation')
      .leftJoin('operation.cardInvoice', 'invoice')
      .where('operation.centro_financeiro_id = :centerId', { centerId })
      .andWhere('operation.is_invoice_payment = 0')
      .andWhere('operation.is_active = 1')
      .andWhere("invoice.status = 'aberta'")
      .getCount()
  }

  async function softRemoveCenter(center: Center) {
    const openPurchases = await countOpenInvoicePurchases(center.id)
    if (openPurchases > 0) {
      $q.notify({
        type: 'warning',
        message: 'Não é possível inativar este centro',
        caption: 'Há compras em faturas abertas. Pague ou resolva as faturas antes de inativar.',
      })
      return
    }
    $q.dialog({
      title: 'Inativar centro?',
      message:
        'Este centro será inativado e deixará de ser contabilizado. Você poderá reativá-lo posteriormente.',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      expensesDataSource.dataSource
        .transaction(async (manager) => {
          await manager
            .createQueryBuilder()
            .update(Operation)
            .set({ isActive: false })
            .where('centro_financeiro_id = :id', { id: center.id })
            .execute()

          await manager
            .createQueryBuilder()
            .update(Center)
            .set({ isActive: false })
            .where('id = :id', { id: center.id })
            .execute()
        })
        .then(() => {
          center.isActive = false
          $q.notify({
            type: 'positive',
            message: `O centro ${center.name} foi inativado com sucesso!`,
          })
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          $q.notify({
            type: 'negative',
            message: 'Falha ao desativar centro financeiro',
            caption: message,
          })
        })
    })
  }

  function reactivateCenter(center: Center) {
    $q.dialog({
      title: 'Reativar centro?',
      message: 'Este centro será reativado e passará a ser contabilizado novamente.',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      expensesDataSource.dataSource
        .transaction(async (manager) => {
          await manager
            .createQueryBuilder()
            .update(Operation)
            .set({ isActive: true })
            .where('centro_financeiro_id = :id', { id: center.id })
            .execute()

          await manager
            .createQueryBuilder()
            .update(Center)
            .set({ isActive: true })
            .where('id = :id', { id: center.id })
            .execute()
        })
        .then(() => {
          center.isActive = true
          $q.notify({
            type: 'positive',
            message: `O centro ${center.name} foi reativado com sucesso!`,
          })
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : String(error)
          $q.notify({
            type: 'negative',
            message: 'Falha ao reativar centro financeiro',
            caption: message,
          })
        })
    })
  }

  function removeCenter(center: Center) {
    $q.dialog({
      title: 'Excluir centro?',
      message: 'Esta operação é irreversível',
      ok: {
        label: 'Confirmar',
      },
      cancel: {
        label: 'Cancelar',
        color: 'negative',
        flat: true,
      },
    }).onOk(() => {
      if (center.isDefaultCenter) {
        $q.notify({
          type: 'negative',
          message: `Falha ao excluir centro financeiro`,
          caption: 'Não é permitido excluir o centro financeiro padrão',
        })
        return
      }
      const centerIndex = centers.value.findIndex((element) => element.id === center.id)
      centerRepository
        .remove(center)
        .then(() => {
          centers.value = centers.value.filter((_, index) => index !== centerIndex)
        })
        .catch((error) => {
          $q.notify({
            type: 'negative',
            message: `Falha ao excluir centro financeiro`,
            caption: error.message,
          })
        })
    })
  }

  async function getSummary() {
    // Compras no crédito não entram no saldo de caixa.
    // Filtros no JOIN para preservar centros sem operações (LEFT JOIN).
    const cashOpsJoin =
      'operation.is_active = 1 AND NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)'

    const summary = await centerRepository
      .createQueryBuilder('center')
      .leftJoin('center.operations', 'operation', cashOpsJoin)
      .select('center.name', 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .groupBy('center.name')
      .orderBy('center.id')
      .getRawMany()
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.is_active = 1')
      .andWhere(
        'NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)',
      )
      .getRawMany()

    return summary.concat(total)
  }

  async function getCurrentSummary() {
    // Compras no crédito não entram no saldo de caixa.
    const now = dayjs().format('YYYY-MM-DD')
    const cashOpsJoin =
      'operation.is_active = 1 AND operation.date <= :now AND NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)'

    const summary = await centerRepository
      .createQueryBuilder('center')
      .leftJoin('center.operations', 'operation', cashOpsJoin, { now })
      .select('center.name', 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('center.is_active = 1')
      .groupBy('center.name')
      .orderBy('center.id')
      .getRawMany()
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.date <= :now', { now })
      .andWhere('operation.is_active = 1')
      .andWhere(
        'NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)',
      )
      .getRawMany()

    return summary.concat(total)
  }

  function selectCenter(exceptFn?: (center: Center) => boolean) {
    return new Promise<Center | null>((resolve) => {
      $q.dialog({
        component: SelectCenterDialog,
        componentProps: {
          exceptFn,
        },
      })
        .onOk((center: Center) => {
          resolve(center)
        })
        .onCancel(() => {
          resolve(null)
        })
    })
  }

  return {
    centers,
    activeCenters,
    fetchCenters,
    showCenters,
    addCenter,
    editCenter,
    softRemoveCenter,
    reactivateCenter,
    removeCenter,
    getSummary,
    getCurrentSummary,
    selectCenter,
  }
})

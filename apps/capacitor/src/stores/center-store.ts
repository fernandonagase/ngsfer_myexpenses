import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

import { Center, Operation } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import CenterFormDialog from 'src/components/center/CenterFormDialog.vue'
import ConfirmSheetDialog from 'src/components/ConfirmSheetDialog.vue'
import SelectCenterDialog from 'src/components/center/SelectCenterDialog.vue'
import { NONE_LABEL } from 'src/models/center-scope'

export type CenterPick = { center: Center | null }

/** Máximo de centros ativos ao mesmo tempo. */
export const MAX_ACTIVE_CENTERS = 5

const centerRepository = expensesDataSource.dataSource.getRepository(Center)
const operationRepository = expensesDataSource.dataSource.getRepository(Operation)

export const useCenterStore = defineStore('center', () => {
  const $q = useQuasar()
  const router = useRouter()

  const centers = ref<Array<Center>>([])

  const activeCenters = computed(() => {
    return centers.value.filter((center) => center.isActive)
  })

  const hasActiveCenters = computed(() => activeCenters.value.length > 0)

  const canAddCenter = computed(() => activeCenters.value.length < MAX_ACTIVE_CENTERS)

  async function fetchCenters() {
    centers.value = await centerRepository.find({ order: { id: 'ASC' } })
  }

  function showCenters() {
    void router.push({ name: 'centers' })
  }

  /** Nº de operações (ativas ou não) por centro (id → contagem). */
  async function countOperationsByCenter(): Promise<Record<number, number>> {
    const rows = await operationRepository
      .createQueryBuilder('operation')
      .select('operation.centro_financeiro_id', 'centerId')
      .addSelect('COUNT(operation.id)', 'count')
      .where('operation.centro_financeiro_id IS NOT NULL')
      .groupBy('operation.centro_financeiro_id')
      .getRawMany<{ centerId: number; count: number }>()
    const counts: Record<number, number> = {}
    for (const row of rows) counts[Number(row.centerId)] = Number(row.count)
    return counts
  }

  function openCenterForm(initial: { title: string; name?: string }) {
    return new Promise<{ name: string } | null>((resolve) => {
      $q.dialog({
        component: CenterFormDialog,
        componentProps: initial,
        persistent: true,
      })
        .onOk((payload: { name: string }) => resolve(payload))
        .onCancel(() => resolve(null))
    })
  }

  function notifyError(message: string, error: unknown) {
    $q.notify({
      type: 'negative',
      message,
      caption: error instanceof Error ? error.message : String(error),
    })
  }

  function addCenter() {
    if (!canAddCenter.value) {
      $q.notify({
        type: 'warning',
        message: `Limite de ${MAX_ACTIVE_CENTERS} centros ativos atingido`,
        caption: 'Inative um centro para criar outro.',
      })
      return
    }
    void openCenterForm({ title: 'Novo centro' }).then(async (payload) => {
      if (!payload) return
      const center = new Center()
      center.name = payload.name
      center.isActive = true
      try {
        await centerRepository.save(center)
        await fetchCenters()
        $q.notify({ type: 'positive', message: `Centro "${center.name}" criado` })
      } catch (error) {
        notifyError('Falha ao cadastrar centro financeiro', error)
      }
    })
  }

  function editCenter(center: Center) {
    void openCenterForm({ title: 'Editar centro', name: center.name }).then(async (payload) => {
      if (!payload) return
      try {
        center.name = payload.name
        await centerRepository.save(center)
        await fetchCenters()
        $q.notify({ type: 'positive', message: 'Alterações salvas' })
      } catch (error) {
        notifyError('Falha ao salvar centro financeiro', error)
      }
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

  function setActive(center: Center, isActive: boolean) {
    return expensesDataSource.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(Operation)
        .set({ isActive })
        .where('centro_financeiro_id = :id', { id: center.id })
        .execute()

      await manager
        .createQueryBuilder()
        .update(Center)
        .set({ isActive })
        .where('id = :id', { id: center.id })
        .execute()
    })
  }

  /** Folha de confirmação; resolve true no OK, false ao cancelar. */
  function confirm(props: {
    title: string
    message: string
    confirmLabel: string
    destructive?: boolean
  }) {
    return new Promise<boolean>((resolve) => {
      $q.dialog({ component: ConfirmSheetDialog, componentProps: props })
        .onOk(() => resolve(true))
        .onCancel(() => resolve(false))
    })
  }

  /** Resolve true quando o centro foi inativado (as operações dele mudam de estado). */
  async function softRemoveCenter(center: Center): Promise<boolean> {
    const openPurchases = await countOpenInvoicePurchases(center.id)
    if (openPurchases > 0) {
      $q.notify({
        type: 'warning',
        message: 'Não é possível inativar este centro',
        caption: 'Há compras em faturas abertas. Pague ou resolva as faturas antes de inativar.',
      })
      return false
    }
    const ok = await confirm({
      title: `Inativar "${center.name}"?`,
      message:
        'As operações deste centro deixam de ser contabilizadas. Você pode reativá-lo depois.',
      confirmLabel: 'Inativar',
    })
    if (!ok) return false
    try {
      await setActive(center, false)
      await fetchCenters()
      $q.notify({ type: 'positive', message: `Centro "${center.name}" inativado` })
      return true
    } catch (error) {
      notifyError('Falha ao desativar centro financeiro', error)
      return false
    }
  }

  /** Resolve true quando o centro foi reativado. */
  async function reactivateCenter(center: Center): Promise<boolean> {
    if (!canAddCenter.value) {
      $q.notify({
        type: 'warning',
        message: `Limite de ${MAX_ACTIVE_CENTERS} centros ativos atingido`,
        caption: 'Inative outro centro para reativar este.',
      })
      return false
    }
    const ok = await confirm({
      title: `Reativar "${center.name}"?`,
      message: 'As operações deste centro voltam a ser contabilizadas.',
      confirmLabel: 'Reativar',
    })
    if (!ok) return false
    try {
      await setActive(center, true)
      await fetchCenters()
      $q.notify({ type: 'positive', message: `Centro "${center.name}" reativado` })
      return true
    } catch (error) {
      notifyError('Falha ao reativar centro financeiro', error)
      return false
    }
  }

  /** Apaga o centro e todas as suas operações. Resolve true quando excluiu. */
  async function removeCenter(center: Center, operationCount = 0): Promise<boolean> {
    const message =
      operationCount > 0
        ? `As ${operationCount} operações deste centro serão apagadas. Prefira "Inativar" se quiser manter o histórico.`
        : 'Isso não pode ser desfeito.'
    const ok = await confirm({
      title: 'Excluir centro?',
      message,
      confirmLabel: 'Excluir',
      destructive: true,
    })
    if (!ok) return false
    try {
      await expensesDataSource.dataSource.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .delete()
          .from(Operation)
          .where('centro_financeiro_id = :id', { id: center.id })
          .execute()
        await manager.delete(Center, center.id)
      })
      await fetchCenters()
      $q.notify({ type: 'positive', message: `Centro "${center.name}" excluído` })
      return true
    } catch (error) {
      notifyError('Falha ao excluir centro financeiro', error)
      return false
    }
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
    const noneRow = await operationRepository
      .createQueryBuilder('operation')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id IS NULL')
      .andWhere('operation.is_active = 1')
      .andWhere('NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)')
      .getRawOne<{ count: number; valueInCents: number }>()
    const noneLine =
      noneRow && Number(noneRow.count) > 0
        ? [{ center: NONE_LABEL, valueInCents: noneRow.valueInCents }]
        : []
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.is_active = 1')
      .andWhere('NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)')
      .getRawMany()

    return summary.concat(noneLine, total)
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
    const noneRow = await operationRepository
      .createQueryBuilder('operation')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.centro_financeiro_id IS NULL')
      .andWhere('operation.date <= :now', { now })
      .andWhere('operation.is_active = 1')
      .andWhere('NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)')
      .getRawOne<{ count: number; valueInCents: number }>()
    const noneLine =
      noneRow && Number(noneRow.count) > 0
        ? [{ center: NONE_LABEL, valueInCents: noneRow.valueInCents }]
        : []
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.date <= :now', { now })
      .andWhere('operation.is_active = 1')
      .andWhere('NOT (operation.fatura_cartao_id IS NOT NULL AND operation.is_invoice_payment = 0)')
      .getRawMany()

    return summary.concat(noneLine, total)
  }

  function selectCenter(
    exceptFn?: (center: Center) => boolean,
    options?: { allowNone?: boolean },
  ): Promise<CenterPick | null> {
    return new Promise<CenterPick | null>((resolve) => {
      $q.dialog({
        component: SelectCenterDialog,
        componentProps: {
          exceptFn,
          allowNone: options?.allowNone ?? false,
        },
      })
        .onOk((pick: CenterPick) => {
          resolve(pick)
        })
        .onCancel(() => {
          resolve(null)
        })
    })
  }

  return {
    centers,
    activeCenters,
    hasActiveCenters,
    canAddCenter,
    fetchCenters,
    showCenters,
    countOperationsByCenter,
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

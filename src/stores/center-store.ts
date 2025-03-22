import { ref } from 'vue'
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
    const summary = await centerRepository
      .createQueryBuilder('center')
      .leftJoinAndSelect('center.operations', 'operation')
      .select('center.name', 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .groupBy('center.name')
      .orderBy('center.id')
      .getRawMany()
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .getRawMany()

    return summary.concat(total)
  }

  async function getCurrentSummary() {
    const summary = await centerRepository
      .createQueryBuilder('center')
      .leftJoinAndSelect('center.operations', 'operation')
      .select('center.name', 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.date <= :now', { now: dayjs().format('YYYY-MM-DD') })
      .groupBy('center.name')
      .orderBy('center.id')
      .getRawMany()
    const total = await operationRepository
      .createQueryBuilder('operation')
      .select("'Total'", 'center')
      .addSelect('SUM(operation.valueInCents)', 'valueInCents')
      .where('operation.date <= :now', { now: dayjs().format('YYYY-MM-DD') })
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
    fetchCenters,
    showCenters,
    addCenter,
    editCenter,
    removeCenter,
    getSummary,
    getCurrentSummary,
    selectCenter,
  }
})

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useQuasar } from 'quasar'

import { Center, Operation } from 'src/databases/entities/expenses'
import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import CenterDialog from 'src/components/center/CenterDialog.vue'

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
      void centerRepository.save(center)
      centers.value = [...centers.value, center]
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
      const centerId = center.id
      void centerRepository.remove(center)
      centers.value = centers.value.filter((center) => center.id !== centerId)
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

  return { centers, fetchCenters, showCenters, addCenter, editCenter, removeCenter, getSummary }
})

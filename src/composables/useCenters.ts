import { ref } from 'vue'

import expensesDataSource from 'src/databases/datasources/ExpensesDatasource'
import { Center } from 'src/databases/entities/expenses'
import { useQuasar } from 'quasar'
import CenterDialog from 'src/components/center/CenterDialog.vue'

function useCenters() {
  const $q = useQuasar()

  const centers = ref<Center[]>([])
  const repository = expensesDataSource.dataSource.getRepository(Center)

  async function findAllCenters() {
    centers.value = await repository.find()
  }

  async function addCenter(center: Center) {
    await repository.save(center)
    centers.value = [...centers.value, center]
  }

  async function removeCenterById(id: number) {
    await repository.delete(id)
    centers.value = centers.value.filter((center) => center.id !== id)
  }

  function showCenters() {
    $q.dialog({
      component: CenterDialog,
      persistent: true,
    })
  }

  function showNewCenterDialog() {
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
      void addCenter(center)
    })
  }

  function showEditCenterDialog(center: Center) {
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
      void repository.save(center)
    })
  }

  return {
    centers: centers,
    findAllCenters,
    addCenter,
    removeCenterById,
    showCenters,
    showNewCenterDialog,
    showEditCenterDialog,
  }
}

export { useCenters }

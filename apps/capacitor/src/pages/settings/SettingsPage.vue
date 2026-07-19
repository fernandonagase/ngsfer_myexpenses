<script setup lang="ts">
import { useQuasar } from 'quasar'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import { actWithDbConnectionStopped } from 'src/databases/datasources/ExpensesDatasource'
import { backup, importBackup } from 'src/services/backup-service'
import { notificationService } from 'src/services/notification-service'
import { useCategoryStore } from 'src/stores/category-store'
import { useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'

const $q = useQuasar()
const { refreshScreen } = useOperationStore()

const centerStore = useCenterStore()
const categoryStore = useCategoryStore()
// const operationStore = useOperationStore()

async function doBackup() {
  $q.loading.show({
    delay: 700,
  })
  const ret = await backup()
  $q.loading.hide()
  if (ret.ok) {
    $q.notify({
      type: 'positive',
      message: 'Backup realizado com sucesso!',
    })
  } else {
    console.error('Erro ao realizar backup:', ret.error)
    $q.notify({
      type: 'negative',
      message: `Erro ao realizar backup. Tente novamente mais tarde.`,
    })
  }
}

async function doImportBackup() {
  try {
    await actWithDbConnectionStopped(async () => {
      await importBackup()
    })
    $q.notify({
      type: 'positive',
      message: 'Backup restaurado com sucesso!',
    })
    await refreshScreen()
    await notificationService.rescheduleAll()
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <q-page>
    <ErrorBoundary>
      <q-list>
        <q-item-label header>Cadastros</q-item-label>
        <q-item clickable v-ripple @click="centerStore.showCenters()">
          <q-item-section avatar>
            <q-icon name="account_balance" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Centros financeiros</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="categoryStore.showCategories()">
          <q-item-section avatar>
            <q-icon name="label" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Categorias</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple :to="{ name: 'recurrence' }">
          <q-item-section avatar>
            <q-icon name="event_repeat" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Operações recorrentes</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator spaced />
        <q-item-label header>Backup</q-item-label>
        <q-item clickable v-ripple @click="doImportBackup()">
          <q-item-section avatar>
            <q-icon name="cloud_download" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Importar Backup</q-item-label>
            <q-item-label caption>
              O banco de dados será carregado do arquivo importado
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable v-ripple @click="doBackup()">
          <q-item-section avatar>
            <q-icon name="backup" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Exportar Backup</q-item-label>
            <q-item-label caption>
              O banco de dados será salvo na pasta pública de documentos
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </ErrorBoundary>
  </q-page>
</template>

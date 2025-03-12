<script setup lang="ts">
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import { backup } from 'src/services/backup-service'

async function doBackup() {
  await backup()
}
</script>

<template>
  <q-page>
    <ErrorBoundary>
      <q-list>
        <q-item clickable v-ripple @click="doBackup()">
          <q-item-section avatar>
            <q-icon name="backup" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Backup</q-item-label>
            <q-item-label caption>
              O banco de dados será salvo na pasta pública de documentos
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </ErrorBoundary>
  </q-page>
</template>

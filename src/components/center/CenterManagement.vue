<template>
  <q-list separator>
    <q-item v-for="center in centers" :key="center.id">
      <q-item-section>{{ center.name }}</q-item-section>
      <q-item-section side>
        <q-btn icon="more_vert" size="12px" flat dense round>
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="showEditCenterDialog(center)">
                <q-item-section>Editar</q-item-section>
                <q-item-section side>
                  <q-icon name="edit" size="xs" />
                </q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="removeCenterById(center.id)">
                <q-item-section>Excluir</q-item-section>
                <q-item-section side>
                  <q-icon name="delete" size="xs" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-item-section>
    </q-item>
    <q-item v-if="centers.length < 5" v-ripple clickable @click="showNewCenterDialog()">
      <q-item-section>Novo</q-item-section>
      <q-item-section side><q-icon name="add" /></q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useCenters } from 'src/composables/useCenters'

const { centers, findAllCenters, showNewCenterDialog, removeCenterById, showEditCenterDialog } =
  useCenters()

await findAllCenters()
</script>

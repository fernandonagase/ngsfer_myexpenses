<template>
  <q-list separator>
    <q-item v-for="center in centers" :key="center.id">
      <q-item-section>{{ center.name }}</q-item-section>
    </q-item>
    <q-item v-if="centers.length < 5" v-ripple clickable @click="showNewCenterDialog()">
      <q-item-section>Novo</q-item-section>
      <q-item-section side><q-icon name="add" /></q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useCenters } from 'src/composables/useCenters'

const { centers, findAllCenters, showNewCenterDialog } = useCenters()

await findAllCenters()
</script>

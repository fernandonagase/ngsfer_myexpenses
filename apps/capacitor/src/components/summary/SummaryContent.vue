<script setup lang="ts">
import { BRL } from '@ngsfer-myexpenses/utils'

import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()

const summary = await centerStore.getCurrentSummary()
</script>

<template>
  <q-list separator>
    <q-item v-for="item in summary" :key="item.center">
      <q-item-section>
        <q-item-label>{{ item.center }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label>{{ BRL(item.valueInCents / 100).format() }}</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

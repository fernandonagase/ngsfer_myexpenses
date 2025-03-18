<script setup lang="ts">
import { useCenterStore } from 'src/stores/center-store'
import { BRL } from 'src/helpers/currency'

const centerStore = useCenterStore()

const summary = await centerStore.getSummary()
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

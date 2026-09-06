<script setup lang="ts">
import { computed } from 'vue'

import type { Center } from 'src/databases/entities/expenses'
import { useCenterStore } from 'src/stores/center-store'
import { NONE_LABEL } from 'src/models/center-scope'

const props = withDefaults(
  defineProps<{ exceptFn?: (center: Center) => boolean; allowNone?: boolean }>(),
  {
    exceptFn: () => false,
    allowNone: false,
  },
)
defineEmits<{ select: [center: Center | null] }>()

const centerStore = useCenterStore()

const filteredCenters = computed(() =>
  centerStore.centers.filter((center) => !props.exceptFn(center)),
)
</script>

<template>
  <q-list separator>
    <q-item
      v-for="center in filteredCenters"
      :key="center.id"
      clickable
      @click="$emit('select', center)"
    >
      <q-item-section>
        <q-item-label>
          {{ center.name }}
        </q-item-label>
      </q-item-section>
    </q-item>
    <q-item v-if="allowNone" clickable @click="$emit('select', null)">
      <q-item-section>
        <q-item-label>
          {{ NONE_LABEL }}
        </q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

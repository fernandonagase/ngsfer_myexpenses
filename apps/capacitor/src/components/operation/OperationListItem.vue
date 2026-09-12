<script setup lang="ts">
import { computed } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'

import ConcealableValue from 'src/components/ConcealableValue.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    title: string
    meta?: string
    valueInCents: number
    /** Mostra "+" para valores positivos. */
    signed?: boolean
    /** Sempre exibe o módulo do valor (ex.: compras de fatura). */
    absolute?: boolean
  }>(),
  { signed: true, absolute: false },
)

defineEmits<{ click: [] }>()

const isIncome = computed(() => props.valueInCents > 0)

const valueText = computed(() => {
  const cents = props.absolute ? Math.abs(props.valueInCents) : props.valueInCents
  const prefix = props.signed && !props.absolute && cents > 0 ? '+' : ''
  return `${prefix}${BRL(cents / 100).format()}`
})
</script>

<template>
  <div class="ds-row ds-row--clickable op-item" @click="$emit('click')">
    <div
      class="ds-avatar"
      :class="isIncome && !absolute ? 'ds-avatar--income' : 'ds-avatar--neutral'"
    >
      <q-icon :name="icon" size="20px" />
    </div>
    <div class="ds-row__body">
      <div class="ds-row__title">{{ title }}</div>
      <div v-if="meta" class="ds-row__meta">{{ meta }}</div>
    </div>
    <ConcealableValue concealed-class="ds-row__value">
      <div class="ds-row__value" :class="{ 'op-item__value--income': isIncome && !absolute }">
        {{ valueText }}
      </div>
    </ConcealableValue>
  </div>
</template>

<style lang="scss" scoped>
.op-item {
  padding: 12px 14px;
}

.op-item__value--income {
  color: var(--ds-income);
}
</style>

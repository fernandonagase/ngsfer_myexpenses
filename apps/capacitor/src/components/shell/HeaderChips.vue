<script setup lang="ts" generic="T extends string">
export type HeaderChip<T extends string> = { value: T; label: string; icon?: string }

defineProps<{
  options: ReadonlyArray<HeaderChip<T>>
}>()

const model = defineModel<T | undefined>({ required: true })
</script>

<template>
  <div class="header-chips ds-scroll-x">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="header-chips__chip"
      :class="{ 'header-chips__chip--active': option.value === model }"
      @click="model = option.value"
    >
      <q-icon v-if="option.icon" :name="option.icon" size="17px" />
      {{ option.label }}
    </button>
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.header-chips {
  margin: 0 -20px;
  padding: 0 20px;
}

.header-chips__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  background: var(--ds-header-pill);
  color: #fff;
  -webkit-tap-highlight-color: transparent;
}

.header-chips__chip--active {
  background: #fff;
  color: var(--ds-header);
  font-weight: 700;
}
</style>

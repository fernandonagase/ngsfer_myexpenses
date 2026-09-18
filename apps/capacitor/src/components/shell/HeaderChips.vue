<script setup lang="ts" generic="T extends string">
import { nextTick, onMounted, ref, watch } from 'vue'

export type HeaderChip<T extends string> = { value: T; label: string; icon?: string }

const props = defineProps<{
  options: ReadonlyArray<HeaderChip<T>>
}>()

const model = defineModel<T | undefined>({ required: true })

const containerRef = ref<HTMLElement>()
const chipRefs = new Map<T, HTMLButtonElement>()

function setChipRef(value: T, el: Element | null) {
  if (el) chipRefs.set(value, el as HTMLButtonElement)
  else chipRefs.delete(value)
}

function scrollActiveIntoView(behavior: ScrollBehavior) {
  const container = containerRef.value
  if (!container || !model.value) return

  const isLastOption = props.options.at(-1)?.value === model.value
  if (isLastOption) {
    container.scrollTo({ left: container.scrollWidth, behavior })
    return
  }

  chipRefs.get(model.value)?.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' })
}

// onMounted (não a 1a chamada do watch immediate) garante que containerRef já esteja
// vinculado: dentro de componentes async + <Suspense>, o nextTick do watch immediate pode
// disparar antes do DOM deste componente ser realmente montado.
onMounted(() => scrollActiveIntoView('auto'))

watch(
  () => [model.value, props.options] as const,
  () => nextTick(() => scrollActiveIntoView('auto')),
)
</script>

<template>
  <div ref="containerRef" class="header-chips ds-scroll-x">
    <button
      v-for="option in options"
      :key="option.value"
      :ref="(el) => setChipRef(option.value, el as Element | null)"
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

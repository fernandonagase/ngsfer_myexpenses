<template>
  <q-card
    class="q-dialog-plugin bottom-sheet-card"
    :class="{ 'bottom-sheet-card--dragging': isDragging }"
    :style="{ transform: `translateY(${translateY}px)` }"
  >
    <div
      class="bottom-sheet-handle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="bottom-sheet-handle__bar" />
    </div>
    <q-card-section class="row items-center no-wrap">
      <div class="text-h6 col">{{ title }}</div>
      <slot name="header-side" />
    </q-card-section>
    <q-card-section>
      <slot />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { useSheetDrag } from 'src/composables/useSheetDrag'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { translateY, isDragging, onPointerDown, onPointerMove, onPointerUp } = useSheetDrag(() =>
  emit('dismiss'),
)
</script>

<style lang="scss" scoped>
.bottom-sheet-card {
  border-radius: 20px 20px 0 0;
  transition: transform 0.2s ease-out;

  &--dragging {
    transition: none;
  }
}

.bottom-sheet-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  &__bar {
    width: 36px;
    height: 4px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.24);
  }
}

:global(body.body--dark) .bottom-sheet-handle__bar {
  background: rgba(255, 255, 255, 0.35);
}
</style>

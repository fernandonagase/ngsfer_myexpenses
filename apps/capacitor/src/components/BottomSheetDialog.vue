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
import { ref } from 'vue'

defineProps<{
  title: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const DISMISS_DISTANCE = 100
const DISMISS_VELOCITY = 0.5

const translateY = ref(0)
const isDragging = ref(false)

let startY = 0
let lastY = 0
let lastTime = 0
let velocityY = 0
let activePointerId: number | null = null

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return

  activePointerId = event.pointerId
  startY = event.clientY
  lastY = event.clientY
  lastTime = event.timeStamp
  velocityY = 0
  isDragging.value = true
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== activePointerId) return

  const deltaY = Math.max(0, event.clientY - startY)
  translateY.value = deltaY

  const elapsed = event.timeStamp - lastTime
  if (elapsed > 0) {
    velocityY = (event.clientY - lastY) / elapsed
  }
  lastY = event.clientY
  lastTime = event.timeStamp
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value || event.pointerId !== activePointerId) return

  isDragging.value = false
  activePointerId = null

  const shouldDismiss = translateY.value > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY
  if (shouldDismiss) {
    emit('dismiss')
    return
  }

  translateY.value = 0
}
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

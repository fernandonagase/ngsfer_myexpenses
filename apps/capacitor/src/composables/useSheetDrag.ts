import { ref } from 'vue'

const DISMISS_DISTANCE = 100
const DISMISS_VELOCITY = 0.5

/**
 * Arrastar o puxador para baixo fecha a folha. Devolve o deslocamento atual
 * (para o `transform` do card) e os handlers de ponteiro do puxador.
 */
export function useSheetDrag(onDismiss: () => void) {
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

    translateY.value = Math.max(0, event.clientY - startY)

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

    if (translateY.value > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY) {
      onDismiss()
      return
    }

    translateY.value = 0
  }

  return {
    translateY,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}

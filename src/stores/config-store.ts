import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const hideValues = ref(true)

  function toggleValuesVisibility() {
    hideValues.value = !hideValues.value
  }

  return { hideValues, toggleValuesVisibility }
})

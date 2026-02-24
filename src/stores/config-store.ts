import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const HIDE_VALUES_STORAGE_KEY = 'config.hideValues'

  function getInitialHideValues() {
    const savedValue = localStorage.getItem(HIDE_VALUES_STORAGE_KEY)
    if (savedValue === null) {
      return true
    }
    return savedValue === 'true'
  }

  const hideValues = ref(getInitialHideValues())

  function persistHideValues() {
    localStorage.setItem(HIDE_VALUES_STORAGE_KEY, String(hideValues.value))
  }

  function toggleValuesVisibility() {
    hideValues.value = !hideValues.value
    persistHideValues()
  }

  return { hideValues, toggleValuesVisibility }
})

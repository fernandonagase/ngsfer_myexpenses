import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const HIDE_VALUES_STORAGE_KEY = 'config.hideValues'
  const SHOW_OPERATION_DETAILS_STORAGE_KEY = 'config.showOperationDetails'

  function getInitialHideValues() {
    const savedValue = localStorage.getItem(HIDE_VALUES_STORAGE_KEY)
    if (savedValue === null) {
      return true
    }
    return savedValue === 'true'
  }

  function getInitialShowOperationDetails() {
    const savedValue = localStorage.getItem(SHOW_OPERATION_DETAILS_STORAGE_KEY)
    if (savedValue === null) {
      return true
    }
    return savedValue === 'true'
  }

  const hideValues = ref(getInitialHideValues())
  const showOperationDetails = ref(getInitialShowOperationDetails())

  function persistHideValues() {
    localStorage.setItem(HIDE_VALUES_STORAGE_KEY, String(hideValues.value))
  }

  function persistShowOperationDetails() {
    localStorage.setItem(SHOW_OPERATION_DETAILS_STORAGE_KEY, String(showOperationDetails.value))
  }

  function toggleValuesVisibility() {
    hideValues.value = !hideValues.value
    persistHideValues()
  }

  function toggleOperationDetailsVisibility() {
    showOperationDetails.value = !showOperationDetails.value
    persistShowOperationDetails()
  }

  return {
    hideValues,
    showOperationDetails,
    toggleValuesVisibility,
    toggleOperationDetailsVisibility,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConfigStore = defineStore('config', () => {
  const HIDE_VALUES_STORAGE_KEY = 'config.hideValues'
  const SHOW_OPERATION_DETAILS_STORAGE_KEY = 'config.showOperationDetails'
  const SHOW_OPERATION_DETAILS_BY_DAY_STORAGE_KEY = 'config.showOperationDetailsByDay'

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

  function getInitialShowOperationDetailsByDay(): Record<string, boolean> {
    const savedValue = localStorage.getItem(SHOW_OPERATION_DETAILS_BY_DAY_STORAGE_KEY)
    if (savedValue === null) {
      return {}
    }

    try {
      const parsed = JSON.parse(savedValue) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>
      }
    } catch {
      // Se houver corrupção no localStorage, volta ao padrão
    }

    return {}
  }

  const hideValues = ref(getInitialHideValues())
  const showOperationDetails = ref(getInitialShowOperationDetails())
  const showOperationDetailsByDay = ref<Record<string, boolean>>(getInitialShowOperationDetailsByDay())

  function persistHideValues() {
    localStorage.setItem(HIDE_VALUES_STORAGE_KEY, String(hideValues.value))
  }

  function persistShowOperationDetails() {
    localStorage.setItem(SHOW_OPERATION_DETAILS_STORAGE_KEY, String(showOperationDetails.value))
  }

  function persistShowOperationDetailsByDay() {
    localStorage.setItem(SHOW_OPERATION_DETAILS_BY_DAY_STORAGE_KEY, JSON.stringify(showOperationDetailsByDay.value))
  }

  function toggleValuesVisibility() {
    hideValues.value = !hideValues.value
    persistHideValues()
  }

  function toggleOperationDetailsVisibility() {
    showOperationDetails.value = !showOperationDetails.value
    persistShowOperationDetails()
    // Ao alternar o modo global, remove overrides por dia para manter consistência.
    showOperationDetailsByDay.value = {}
    persistShowOperationDetailsByDay()
  }

  function toggleOperationDetailsVisibilityForDay(day: string) {
    const currentForDay = showOperationDetailsByDay.value[day]
    const nextForDay = !(currentForDay ?? showOperationDetails.value)

    // Se o valor ajustado ficar igual ao "global", remove a override.
    if (nextForDay === showOperationDetails.value) {
      delete showOperationDetailsByDay.value[day]
    } else {
      showOperationDetailsByDay.value[day] = nextForDay
    }

    persistShowOperationDetailsByDay()
  }

  return {
    hideValues,
    showOperationDetails,
    showOperationDetailsByDay,
    toggleValuesVisibility,
    toggleOperationDetailsVisibility,
    toggleOperationDetailsVisibilityForDay,
  }
})

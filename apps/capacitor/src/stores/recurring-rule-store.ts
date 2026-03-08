import { defineStore, acceptHMRUpdate } from 'pinia'

import { type RecurringRule } from 'src/databases/entities/expenses'
import { getRecurringRuleRepository } from 'src/databases/repositories/recurring-rule-repository'

const recurringRuleRepository = getRecurringRuleRepository()

export const useRecurringRuleStore = defineStore('recurringRuleStore', {
  state: () => ({
    recurringRules: [] as RecurringRule[],
  }),
  getters: {},
  actions: {
    async fetchRecurringRules({
      withCategory,
      withCenter,
    }: {
      withCategory: boolean
      withCenter: boolean
    }) {
      this.recurringRules = await recurringRuleRepository.find({
        relations: {
          category: withCategory,
          center: withCenter,
        },
      })
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRecurringRuleStore, import.meta.hot))
}

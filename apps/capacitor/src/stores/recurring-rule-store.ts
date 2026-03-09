import { defineStore, acceptHMRUpdate } from 'pinia'

import { type RecurringRule } from 'src/domain/RecurringRule'
import { TypeOrmRecurringRuleService } from 'src/services/typeorm-recurring-rule-service'
import type { IRecurringRuleService } from 'src/services/types/IRecurringRuleService'

const recurringRuleService: IRecurringRuleService = new TypeOrmRecurringRuleService()

export const useRecurringRuleStore = defineStore('recurringRuleStore', {
  state: () => ({
    recurringRules: [] as RecurringRule[],
  }),
  getters: {},
  actions: {
    async fetchRecurringRules({ relations = [] }: { relations?: string[] } = {}) {
      const result = await recurringRuleService.list({ relations })
      if (result.ok) {
        this.recurringRules = result.payload
      } else {
        throw new Error('Falha ao carregar regras de recorrência', { cause: result })
      }
    },
    async insert(recurringRule: RecurringRule) {
      const result = await recurringRuleService.insert(recurringRule)
      if (result.ok) {
        return result.payload
      } else {
        throw new Error('Falha ao criar regra de recorrência', { cause: result })
      }
    },
    async save(recurringRule: RecurringRule) {
      const result = await recurringRuleService.update(recurringRule)
      if (result.ok) {
        return result.payload
      } else {
        throw new Error('Falha ao salvar regra de recorrência', { cause: result })
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useRecurringRuleStore, import.meta.hot))
}

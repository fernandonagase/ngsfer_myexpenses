import type { Category } from 'src/databases/entities/expenses'
import { type RecurringRule } from 'src/domain/RecurringRule'

export type ShowEditRecurringRulePayload = {
  valueInCents: number
  description: string
  category: Category
  isActive: boolean
}

export interface IRecurringRuleController {
  showEditRecurringRule(
    recurringRule: RecurringRule,
    options: { editCallback: (payload: ShowEditRecurringRulePayload) => void },
  ): void
}

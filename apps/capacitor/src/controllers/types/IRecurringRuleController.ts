import type { Category, Center } from 'src/databases/entities/expenses'
import {
  type RecurringRuleType,
  type FrequencyType,
  type AnchorMode,
  type EndMode,
} from 'src/databases/entities/expenses/recurring-rule'
import { type RecurringRule } from 'src/domain/RecurringRule'

export type ShowEditRecurringRulePayload = {
  valueInCents: number
  description: string
  category: Category
  center: Center | null
  isActive: boolean
}

export type ShowAddRecurringRulePayload = {
  valueInCents: number
  description: string
  category: Category
  center: Center | null
  startDate: string
  isActive: boolean
  frequency: FrequencyType
  interval: number
  ruleType: RecurringRuleType
  nextRunDate: string
  anchorMode: AnchorMode
  endMode: EndMode
  notificationEnabled?: boolean
  notificationDaysBefore?: number
  notificationTime?: string
}

export interface IRecurringRuleController {
  showAddRecurringRule(options: {
    addCallback: (payload: ShowAddRecurringRulePayload) => void
    defaultCenter: Center | null
  }): void
  showEditRecurringRule(
    recurringRule: RecurringRule,
    options: { editCallback: (payload: ShowEditRecurringRulePayload) => void },
  ): void
}

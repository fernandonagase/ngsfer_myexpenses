import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'

import type { Category, Center } from 'src/databases/entities/expenses'
import {
  AnchorMode,
  type EndMode,
  FrequencyType,
  RecurringRuleType,
} from 'src/databases/entities/expenses/recurring-rule'

export class RecurringRule {
  id?: number
  description?: string
  valueInCents: number
  ruleType: RecurringRuleType
  center?: Center
  category?: Category
  startDate: string
  nextRunDate: string
  frequency: FrequencyType
  interval: number
  anchorMode: AnchorMode
  anchorDay?: number
  endMode: EndMode
  endDate?: string
  isActive: boolean

  constructor({
    id,
    description,
    valueInCents,
    ruleType,
    center,
    category,
    startDate,
    nextRunDate,
    frequency,
    interval,
    anchorMode,
    anchorDay,
    endMode,
    endDate,
    isActive,
  }: {
    id?: number
    description?: string
    valueInCents: number
    ruleType: RecurringRuleType
    center?: Center
    category?: Category
    startDate: string
    nextRunDate: string
    frequency: FrequencyType
    interval: number
    anchorMode: AnchorMode
    anchorDay?: number
    endMode: EndMode
    endDate?: string
    isActive: boolean
  }) {
    if (id) this.id = id
    if (description) this.description = description
    this.valueInCents = valueInCents
    this.ruleType = ruleType
    if (center) this.center = center
    if (category) this.category = category
    this.startDate = startDate
    this.nextRunDate = nextRunDate
    this.frequency = frequency
    this.interval = interval
    this.anchorMode = anchorMode
    if (anchorDay) {
      this.anchorDay = anchorDay
    } else {
      if (anchorMode === AnchorMode.FIXED) {
        this.anchorDay = parseInt(dayjs(this.startDate).format('DD'))
      }
    }
    this.endMode = endMode
    if (endDate) this.endDate = endDate
    this.isActive = isActive
  }

  get valueString() {
    return BRL(this.valueInCents / 100).format()
  }

  get isIncome() {
    return this.ruleType === RecurringRuleType.INCOME
  }

  get isExpense() {
    return this.ruleType === RecurringRuleType.EXPENSE
  }

  get isMonthly() {
    return this.frequency === FrequencyType.MONTHLY
  }
}

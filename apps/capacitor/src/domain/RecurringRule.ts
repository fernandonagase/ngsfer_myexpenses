import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'
import { Operation } from 'src/databases/entities/expenses/operation'

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

  generateCurrentWindowOperations() {
    const windowStart = dayjs().startOf('month')
    const startDate = dayjs(this.startDate)
    const effectiveWindowStart = startDate.isAfter(windowStart) ? startDate : windowStart
    const windowEnd = dayjs().add(1, 'month').endOf('month')
    const operations: Operation[] = []

    if (this.isMonthly && this.anchorDay && this.interval > 0) {
      let monthCursor = effectiveWindowStart.startOf('month')
      let firstDateForCurrentWindow = monthCursor

      while (true) {
        const hasAnchorDayInMonth = this.anchorDay <= monthCursor.daysInMonth()
        if (hasAnchorDayInMonth) {
          const candidate = monthCursor.startOf('month').date(this.anchorDay)
          if (
            candidate.isSame(effectiveWindowStart, 'day') ||
            candidate.isAfter(effectiveWindowStart)
          ) {
            firstDateForCurrentWindow = candidate
            break
          }
        }
        monthCursor = monthCursor.add(1, 'month')
      }

      const effectiveWindowDates = [] as string[]
      let dateCursor = firstDateForCurrentWindow.startOf('month')

      while (dateCursor.isSame(windowEnd, 'month') || dateCursor.isBefore(windowEnd, 'month')) {
        if (this.anchorDay <= dateCursor.daysInMonth()) {
          const operationDate = dateCursor.startOf('month').date(this.anchorDay)
          if (
            operationDate.isSame(firstDateForCurrentWindow, 'day') ||
            operationDate.isAfter(firstDateForCurrentWindow)
          ) {
            if (
              operationDate.isSame(windowEnd, 'day') ||
              operationDate.isBefore(windowEnd, 'day')
            ) {
              effectiveWindowDates.push(operationDate.format('YYYY-MM-DD'))
            }
          }
        }

        dateCursor = dateCursor.add(this.interval, 'month')
      }

      const generatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss')
      effectiveWindowDates.forEach((date) => {
        const operation = new Operation()
        operation.description = this.description ?? ''
        operation.valueInCents = this.valueInCents
        operation.date = date
        operation.isActive = this.isActive
        operation.generatedAt = generatedAt
        operation.generationKey = `${this.id}-${date}`
        operation.recurringRule = this as unknown as NonNullable<Operation['recurringRule']>
        if (this.center) operation.center = this.center
        if (this.category) operation.category = this.category
        operations.push(operation)
      })
    }

    return operations
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

  get isWeekly() {
    return this.frequency === FrequencyType.WEEKLY
  }

  get weeklyAnchorDay() {
    return this.isWeekly ? dayjs(this.startDate).day() : null
  }
}

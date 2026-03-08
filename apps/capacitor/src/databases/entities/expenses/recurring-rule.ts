import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { BRL } from '@ngsfer-myexpenses/utils'

import { Center } from './center'
import { Category } from './category'

export enum FrequencyType {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  YEARLY = 'yearly',
}

export enum AnchorMode {
  FIXED = 'fixed',
  LAST_DAY = 'last_day',
}

export enum EndMode {
  NEVER = 'never',
  UNTIL_DATE = 'until_date',
  COUNT = 'count',
}

export enum RecurringRuleType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('recurring_rule')
export class RecurringRule {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text' })
  description!: string

  @Column({ type: 'int' })
  valueInCents!: number

  @Column({ name: 'type', type: 'text' })
  ruleType!: RecurringRuleType

  @ManyToOne(() => Center, (center) => center.operations)
  @JoinColumn({
    name: 'centro_financeiro_id',
    referencedColumnName: 'id',
  })
  center!: Center

  @ManyToOne(() => Category, (category) => category.operations)
  @JoinColumn({
    name: 'category_id',
    referencedColumnName: 'id',
  })
  category!: Category

  @Column({ name: 'start_date', type: 'text' })
  startDate!: string

  @Column({ name: 'next_run_date', type: 'text' })
  nextRunDate!: string

  @Column({ type: 'text' })
  frequency!: FrequencyType

  @Column({ type: 'int', default: 1 })
  interval!: number

  @Column({ name: 'anchor_mode', type: 'text', default: AnchorMode.FIXED })
  anchorMode!: AnchorMode

  @Column({ name: 'anchor_day', type: 'int' })
  anchorDay!: number

  @Column({ name: 'end_mode', type: 'text', default: EndMode.NEVER })
  endMode!: EndMode

  @Column({ name: 'end_date', type: 'text' })
  endDate!: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

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

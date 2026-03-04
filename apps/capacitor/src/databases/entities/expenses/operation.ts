import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import { Center } from './center'
import { Category } from './category'
import { RecurringRule } from './recurring-rule'

@Entity('operacao_financeira')
export class Operation {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', length: 50 })
  description!: string

  @Column({ type: 'int' })
  valueInCents!: number

  @Column({ type: 'text' })
  date!: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @Column({ name: 'generated_at', type: 'text' })
  generatedAt!: string

  @Column({ name: 'generation_key', type: 'text' })
  generationKey!: string

  @ManyToOne(() => RecurringRule)
  @JoinColumn({
    name: 'recurring_rule_id',
    referencedColumnName: 'id',
  })
  recurringRule!: RecurringRule

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

  get valueString() {
    return BRL(this.valueInCents / 100).format()
  }

  get dateString() {
    return dayjs(this.date).format('DD/MM/YYYY')
  }

  get isIncome() {
    return this.valueInCents > 0
  }

  get isExpense() {
    return this.valueInCents < 0
  }
}

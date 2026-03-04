import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Center } from './center'
import { Category } from './category'

enum FrequencyType {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  YEARLY = 'yearly',
}

enum EndMode {
  NEVER = 'never',
  UNTIL_DATE = 'until_date',
  COUNT = 'count',
}

@Entity('recurring_rule')
export class RecurringRule {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text' })
  description!: string

  @Column({ type: 'int' })
  valueInCents!: number

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

  @Column({ name: 'end_mode', type: 'text', default: EndMode.NEVER })
  endMode!: EndMode

  @Column({ name: 'end_date', type: 'text' })
  endDate!: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean
}

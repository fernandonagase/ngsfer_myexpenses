import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import { Center } from './center'
import { Category } from './category'

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

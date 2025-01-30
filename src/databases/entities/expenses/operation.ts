import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { Center } from './center'

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

  @ManyToOne(() => Center, (center) => center.operations)
  @JoinColumn({
    name: 'centro_financeiro_id',
    referencedColumnName: 'id',
  })
  center!: Center
}

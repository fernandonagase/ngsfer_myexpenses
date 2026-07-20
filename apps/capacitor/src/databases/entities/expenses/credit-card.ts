import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { CardInvoice } from './card-invoice'

@Entity('cartao_credito')
export class CreditCard {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'nome', type: 'text', length: 50 })
  name!: string

  @Column({ name: 'dia_fechamento', type: 'int' })
  closingDay!: number

  @Column({ name: 'dia_vencimento', type: 'int' })
  dueDay!: number

  @Column({ name: 'limite_em_centavos', type: 'int', nullable: true })
  limitInCents?: number | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @OneToMany(() => CardInvoice, (invoice) => invoice.creditCard)
  invoices!: CardInvoice[]
}

import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { CreditCard } from './credit-card'
import { Operation } from './operation'

export enum InvoiceStatus {
  ABERTA = 'aberta',
  FECHADA = 'fechada',
  PAGA = 'paga',
}

@Entity('fatura_cartao')
export class CardInvoice {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => CreditCard, (creditCard) => creditCard.invoices)
  @JoinColumn({
    name: 'cartao_credito_id',
    referencedColumnName: 'id',
  })
  creditCard!: CreditCard

  @Column({ name: 'mes_referencia', type: 'text' })
  referenceMonth!: string

  @Column({ name: 'data_fechamento', type: 'text' })
  closingDate!: string

  @Column({ name: 'data_vencimento', type: 'text' })
  dueDate!: string

  @Column({ name: 'status', type: 'text', default: InvoiceStatus.ABERTA })
  status!: InvoiceStatus

  @Column({ name: 'data_pagamento', type: 'text', nullable: true })
  paymentDate?: string | null

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  /**
   * Marca que a fatura foi reaberta manualmente para edição após já ter
   * fechamento no passado. Usado por `reconcileInvoiceStatuses` para não
   * fechá-la de volta automaticamente até o usuário fechá-la de novo.
   */
  @Column({ name: 'reaberta_para_edicao', type: 'boolean', default: false })
  reopenedForEditing!: boolean

  @OneToMany(() => Operation, (operation) => operation.cardInvoice)
  operations!: Operation[]
}

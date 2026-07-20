import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import { Center } from './center'
import { Category } from './category'
import { RecurringRule } from './recurring-rule'
import { CardInvoice, InvoiceStatus } from './card-invoice'

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
  generatedAt?: string

  @Column({ name: 'generation_key', type: 'text' })
  generationKey?: string

  @ManyToOne(() => RecurringRule, { nullable: true })
  @JoinColumn({
    name: 'recurring_rule_id',
    referencedColumnName: 'id',
  })
  recurringRule?: RecurringRule

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

  @Column({ name: 'notes', type: 'text' })
  notes?: string

  @Column({ name: 'notification_enabled', type: 'boolean', default: false })
  notificationEnabled?: boolean

  @Column({ name: 'notification_days_before', type: 'int', nullable: true })
  notificationDaysBefore?: number

  @Column({ name: 'notification_time', type: 'text', nullable: true })
  notificationTime?: string

  @ManyToOne(() => CardInvoice, (invoice) => invoice.operations, { nullable: true })
  @JoinColumn({
    name: 'fatura_cartao_id',
    referencedColumnName: 'id',
  })
  cardInvoice?: CardInvoice | null

  @Column({ name: 'is_invoice_payment', type: 'boolean', default: false })
  isInvoicePayment!: boolean

  getGenerationKey(recurringRule: RecurringRule, date: string) {
    return `${recurringRule.id}-${date}`
  }

  setRecurringRule(recurringRule: RecurringRule) {
    this.recurringRule = recurringRule
    const today = dayjs().format('YYYY-MM-DD')
    this.generatedAt = today
    this.generationKey = this.getGenerationKey(recurringRule, this.date ?? today)
  }

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

  get isCardPurchase() {
    return this.cardInvoice != null && !this.isInvoicePayment
  }

  /**
   * Compra em fatura fechada/paga é somente-leitura: exige reabrir a fatura
   * para editar. Requer a relação `cardInvoice` carregada.
   */
  get isLockedByInvoice() {
    return this.isCardPurchase && this.cardInvoice!.status !== InvoiceStatus.ABERTA
  }
}

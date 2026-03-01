import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import type { CategoryType } from './types/category.types'
import { Operation } from './operation'

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', length: 25 })
  name!: string

  @Column({ type: 'text' })
  type!: CategoryType

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @OneToMany(() => Operation, (operation) => operation.category)
  operations!: Operation[]
}

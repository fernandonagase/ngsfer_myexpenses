import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

import type { CategoryType } from './types/category.types'

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', length: 25 })
  name!: string

  @Column({ type: 'text' })
  type!: CategoryType
}

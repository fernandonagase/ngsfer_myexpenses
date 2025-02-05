import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'text', length: 25 })
  name!: string

  @Column({ type: 'text' })
  type!: 'Entrada' | 'Saída'
}

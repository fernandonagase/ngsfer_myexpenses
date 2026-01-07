import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { Operation } from './operation'

@Entity('centro_financeiro')
export class Center {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'nome', type: 'text', length: 25 })
  name!: string

  @Column({ name: 'is_default_center', type: 'boolean' })
  isDefaultCenter!: boolean

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean

  @OneToMany(() => Operation, (operation) => operation.center)
  operations!: Operation[]
}

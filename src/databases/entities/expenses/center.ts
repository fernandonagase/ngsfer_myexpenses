import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { Operation } from './operation'

@Entity('centro_financeiro')
export class Center {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ name: 'nome', type: 'text', length: 25 })
  name!: string

  @OneToMany(() => Operation, (operation) => operation.center)
  operations!: Operation[]
}

import { afterEach, describe, expect, it } from 'vitest'
import type { DataSource } from 'typeorm'

import { createInMemoryExpensesDataSource } from 'src/databases/expenses-test-datasource'
import { Category } from 'src/databases/entities/expenses/category'
import { Operation } from 'src/databases/entities/expenses/operation'
import {
  AnchorMode,
  EndMode,
  FrequencyType,
  RecurringRule,
  RecurringRuleType,
} from 'src/databases/entities/expenses/recurring-rule'

import { TypeOrmRecurringRuleService } from './typeorm-recurring-rule-service'

let dataSource: DataSource | null = null

afterEach(async () => {
  if (dataSource) {
    await dataSource.destroy()
    dataSource = null
  }
})

async function setup() {
  dataSource = await createInMemoryExpensesDataSource()
  const manager = dataSource.manager
  const category = await manager.save(Category, { name: 'Moradia', type: 'Saída' })
  const rule = await manager.save(RecurringRule, {
    description: 'Aluguel',
    valueInCents: -150000,
    ruleType: RecurringRuleType.EXPENSE,
    category,
    startDate: '2026-01-05',
    nextRunDate: '2026-02-05',
    frequency: FrequencyType.MONTHLY,
    interval: 1,
    anchorMode: AnchorMode.FIXED,
    anchorDay: 5,
    endMode: EndMode.NEVER,
    isActive: true,
  })
  await manager.save(Operation, {
    description: 'Aluguel',
    valueInCents: -150000,
    date: '2026-01-05',
    category,
    recurringRule: rule,
    generatedAt: '2026-01-01 08:00:00',
    generationKey: `${rule.id}-2026-01-05`,
  })
  const service = new TypeOrmRecurringRuleService(dataSource.getRepository(RecurringRule))
  return { manager, rule, service }
}

describe('TypeOrmRecurringRuleService.remove', () => {
  it('exclui uma regra com lançamentos gerados e devolve ok', async () => {
    const { manager, rule, service } = await setup()

    const result = await service.remove(rule.id)

    expect(result.ok).toBe(true)
    expect(await manager.count(RecurringRule)).toBe(0)
  })

  it('deixa o lançamento gerado no banco, sem vínculo', async () => {
    const { manager, rule, service } = await setup()

    await service.remove(rule.id)

    const rows = await manager.query('SELECT recurring_rule_id FROM operacao_financeira')
    expect(rows).toEqual([{ recurring_rule_id: null }])
  })

  it('devolve a mensagem de origem quando a exclusão falha', async () => {
    const { manager, rule, service } = await setup()
    await manager.query(
      `CREATE TRIGGER bloqueia_exclusao BEFORE DELETE ON recurring_rule
       BEGIN SELECT RAISE(ABORT, 'exclusao bloqueada'); END;`,
    )

    const result = await service.remove(rule.id)

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message).toContain('exclusao bloqueada')
  })
})

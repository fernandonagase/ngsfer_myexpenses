import { afterEach, describe, expect, it } from 'vitest'
import type { DataSource, EntityManager } from 'typeorm'
import dayjs from 'dayjs'

import { createInMemoryExpensesDataSource } from '../../expenses-test-datasource'
import { RecurringRule as RecurringRuleModel } from '../../../domain/RecurringRule'

import { Category } from './category'
import { Operation } from './operation'
import {
  AnchorMode,
  EndMode,
  FrequencyType,
  RecurringRule,
  RecurringRuleType,
} from './recurring-rule'
import { deleteRecurringRuleDetachingOperations } from './recurring-rule-queries'

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
  return { manager, category }
}

/** Regra mensal ancorada no dia 5, sem centro — o mínimo que o app grava. */
async function saveRule(
  manager: EntityManager,
  category: Category,
  overrides: Partial<RecurringRule> = {},
) {
  return manager.save(RecurringRule, {
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
    ...overrides,
  })
}

/** Dois lançamentos já gerados pela regra, como a janela corrente os grava. */
async function saveGeneratedOperations(
  manager: EntityManager,
  category: Category,
  rule: RecurringRule,
) {
  return manager.save(Operation, [
    {
      description: 'Aluguel',
      valueInCents: -150000,
      date: '2026-01-05',
      category,
      recurringRule: rule,
      generatedAt: '2026-01-01 08:00:00',
      generationKey: `${rule.id}-2026-01-05`,
    },
    {
      description: 'Aluguel',
      valueInCents: -150000,
      date: '2026-02-05',
      category,
      recurringRule: rule,
      generatedAt: '2026-01-01 08:00:00',
      generationKey: `${rule.id}-2026-02-05`,
    },
  ])
}

type OperationRow = {
  id: number
  recurring_rule_id: number | null
  generation_key: string | null
  valueInCents: number
  date: string
  category_id: number
}

async function rowsOf(manager: EntityManager): Promise<OperationRow[]> {
  return manager.query(
    'SELECT id, recurring_rule_id, generation_key, valueInCents, date, category_id FROM operacao_financeira ORDER BY date',
  )
}

describe('deleteRecurringRuleDetachingOperations', () => {
  it('remove a regra mesmo com lançamentos já gerados', async () => {
    const { manager, category } = await setup()
    const rule = await saveRule(manager, category)
    await saveGeneratedOperations(manager, category, rule)

    await deleteRecurringRuleDetachingOperations(manager, rule.id)

    expect(await manager.count(RecurringRule)).toBe(0)
  })

  it('mantém os lançamentos gerados com valor, data e categoria intactos', async () => {
    const { manager, category } = await setup()
    const rule = await saveRule(manager, category)
    await saveGeneratedOperations(manager, category, rule)
    const antes = await rowsOf(manager)

    await deleteRecurringRuleDetachingOperations(manager, rule.id)

    const depois = await rowsOf(manager)
    expect(depois).toHaveLength(2)
    expect(depois.map((row) => [row.id, row.valueInCents, row.date, row.category_id])).toEqual(
      antes.map((row) => [row.id, row.valueInCents, row.date, row.category_id]),
    )
  })

  it('zera o vínculo dos lançamentos da regra excluída', async () => {
    const { manager, category } = await setup()
    const rule = await saveRule(manager, category)
    await saveGeneratedOperations(manager, category, rule)

    await deleteRecurringRuleDetachingOperations(manager, rule.id)

    const depois = await rowsOf(manager)
    expect(depois.map((row) => row.recurring_rule_id)).toEqual([null, null])
  })

  it('preserva a generation_key dos lançamentos da regra excluída', async () => {
    const { manager, category } = await setup()
    const rule = await saveRule(manager, category)
    await saveGeneratedOperations(manager, category, rule)

    await deleteRecurringRuleDetachingOperations(manager, rule.id)

    const depois = await rowsOf(manager)
    expect(depois.map((row) => row.generation_key)).toEqual([
      `${rule.id}-2026-01-05`,
      `${rule.id}-2026-02-05`,
    ])
  })

  it('não toca nos lançamentos de outra regra', async () => {
    const { manager, category } = await setup()
    const excluida = await saveRule(manager, category)
    const viva = await saveRule(manager, category, { description: 'Internet', anchorDay: 20 })
    await saveGeneratedOperations(manager, category, excluida)
    await manager.save(Operation, {
      description: 'Internet',
      valueInCents: -9900,
      date: '2026-01-20',
      category,
      recurringRule: viva,
      generatedAt: '2026-01-01 08:00:00',
      generationKey: `${viva.id}-2026-01-20`,
    })

    await deleteRecurringRuleDetachingOperations(manager, excluida.id)

    const daViva = (await rowsOf(manager)).find((row) => row.date === '2026-01-20')
    expect(daViva?.recurring_rule_id).toBe(viva.id)
    expect(daViva?.generation_key).toBe(`${viva.id}-2026-01-20`)
  })

  it('exclui uma regra sem lançamentos sem alterar operações', async () => {
    const { manager, category } = await setup()
    const semLancamentos = await saveRule(manager, category, { description: 'Academia' })
    const outra = await saveRule(manager, category, { description: 'Aluguel' })
    await saveGeneratedOperations(manager, category, outra)
    const antes = await rowsOf(manager)

    await deleteRecurringRuleDetachingOperations(manager, semLancamentos.id)

    expect(await manager.count(RecurringRule)).toBe(1)
    expect(await rowsOf(manager)).toEqual(antes)
  })

  it('desfaz o desvínculo quando a remoção da regra falha', async () => {
    const { manager, category } = await setup()
    const rule = await saveRule(manager, category)
    await saveGeneratedOperations(manager, category, rule)
    const antes = await rowsOf(manager)
    await manager.query(
      `CREATE TRIGGER bloqueia_exclusao BEFORE DELETE ON recurring_rule
       BEGIN SELECT RAISE(ABORT, 'exclusao bloqueada'); END;`,
    )

    await expect(deleteRecurringRuleDetachingOperations(manager, rule.id)).rejects.toThrow()

    expect(await manager.count(RecurringRule)).toBe(1)
    expect(await rowsOf(manager)).toEqual(antes)
  })

  it('não bloqueia a geração de uma regra criada depois da exclusão', async () => {
    const { manager, category } = await setup()
    const anchorDay = Math.min(dayjs().date(), 28)
    const startDate = dayjs().startOf('month').date(anchorDay).format('YYYY-MM-DD')
    const primeira = await saveRule(manager, category, { anchorDay, startDate })

    const gerarEInserir = async (rule: RecurringRule) => {
      const model = new RecurringRuleModel({ ...rule })
      const operations = model.generateCurrentWindowOperations()
      await manager
        .createQueryBuilder()
        .insert()
        .into(Operation)
        .values(operations)
        .orIgnore()
        .execute()
      return operations.length
    }

    const geradasAntes = await gerarEInserir(primeira)
    expect(geradasAntes).toBeGreaterThan(0)

    await deleteRecurringRuleDetachingOperations(manager, primeira.id)

    // `recurring_rule.id` é AUTOINCREMENT: a regra nova nunca recebe o id da excluída, então a
    // `generation_key` preservada dos órfãos não pode colidir com a dela.
    const segunda = await saveRule(manager, category, { anchorDay, startDate })
    expect(segunda.id).not.toBe(primeira.id)

    const geradasDepois = await gerarEInserir(segunda)
    const vinculadas = await manager.count(Operation, {
      where: { recurringRule: { id: segunda.id } },
    })
    expect(geradasDepois).toBeGreaterThan(0)
    expect(vinculadas).toBe(geradasDepois)
  })

  it('some da listagem de regras', async () => {
    const { manager, category } = await setup()
    const excluida = await saveRule(manager, category, { description: 'Aluguel' })
    const viva = await saveRule(manager, category, { description: 'Internet' })
    await saveGeneratedOperations(manager, category, excluida)

    await deleteRecurringRuleDetachingOperations(manager, excluida.id)

    const listadas = await manager.find(RecurringRule)
    expect(listadas.map((rule) => rule.id)).toEqual([viva.id])
  })
})

import type { EntityManager } from 'typeorm'

import { Operation } from './operation'
import { RecurringRule } from './recurring-rule'

/**
 * Exclui a regra e desvincula, na mesma transação, os lançamentos que ela gerou.
 *
 * `operacao_financeira.recurring_rule_id` referencia `recurring_rule(id)` sem `ON DELETE`, e as
 * chaves estrangeiras estão ligadas: apagar a regra direto devolve `FOREIGN KEY constraint failed`
 * enquanto existir um lançamento gerado. Os lançamentos ficam — é o que o diálogo de confirmação
 * promete —, apenas perdem o vínculo.
 *
 * A `generation_key` fica de propósito: ela é `<id da regra>-<data>` e guarda a procedência do
 * lançamento. Não há risco de colisão com uma regra futura porque `recurring_rule.id` é
 * `AUTOINCREMENT` (ver `1777000000000-ExpensesOptionalCenter.ts`) e o SQLite nunca devolve um id
 * já usado.
 */
export async function deleteRecurringRuleDetachingOperations(
  manager: EntityManager,
  id: number,
): Promise<void> {
  await manager.transaction(async (transactionManager) => {
    await transactionManager
      .createQueryBuilder()
      .update(Operation)
      .set({ recurringRule: null })
      .where('recurring_rule_id = :id', { id })
      .execute()

    await transactionManager.delete(RecurringRule, id)
  })
}

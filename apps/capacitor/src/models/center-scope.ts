import type { Center } from 'src/databases/entities/expenses'
import type { WhereExpressionBuilder } from 'typeorm'

export type CenterScope =
  | { kind: 'all' }
  | { kind: 'center'; centerId: number }
  | { kind: 'none' }

export const ALL_SCOPE: CenterScope = { kind: 'all' }
export const NONE_SCOPE: CenterScope = { kind: 'none' }

export function centerScope(center: Center): CenterScope {
  return { kind: 'center', centerId: center.id }
}

export function isSameScope(a: CenterScope, b: CenterScope): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'center' && b.kind === 'center') return a.centerId === b.centerId
  return true
}

/** Cláusula a aplicar; null em `all` (sem filtro). alias padrão 'operation'. */
export function centerScopeWhere(
  scope: CenterScope,
  alias = 'operation',
): { sql: string; params: Record<string, unknown> } | null {
  switch (scope.kind) {
    case 'all':
      return null
    case 'center':
      return {
        sql: `${alias}.centro_financeiro_id = :scopeCenterId`,
        params: { scopeCenterId: scope.centerId },
      }
    case 'none':
      return {
        sql: `${alias}.centro_financeiro_id IS NULL`,
        params: {},
      }
  }
}

/** Único ponto que toca o QueryBuilder. Sempre `andWhere`; em `all` não faz nada. */
export function applyCenterScope<T extends WhereExpressionBuilder>(
  qb: T,
  scope: CenterScope,
  alias = 'operation',
): T {
  const where = centerScopeWhere(scope, alias)
  if (where === null) return qb
  return qb.andWhere(where.sql, where.params) as unknown as T
}

/** Chave estável para q-select (emit-value/map-options): 'all' | 'center:12' | 'none'. */
export function scopeKey(scope: CenterScope): string {
  switch (scope.kind) {
    case 'all':
      return 'all'
    case 'center':
      return `center:${scope.centerId}`
    case 'none':
      return 'none'
  }
}

export function scopeFromKey(key: string): CenterScope {
  if (key === 'all') return ALL_SCOPE
  if (key === 'none') return NONE_SCOPE
  if (key.startsWith('center:')) {
    const id = Number(key.slice('center:'.length))
    if (Number.isFinite(id)) return { kind: 'center', centerId: id }
  }
  return ALL_SCOPE
}

export const ALL_LABEL = 'Todos'
export const NONE_LABEL = 'Sem centro'

export function scopeLabel(scope: CenterScope, centers: ReadonlyArray<Center>): string {
  switch (scope.kind) {
    case 'all':
      return ALL_LABEL
    case 'none':
      return NONE_LABEL
    case 'center': {
      const center = centers.find((c) => c.id === scope.centerId)
      return center?.name ?? NONE_LABEL
    }
  }
}

/** [Todos, ...centros ativos na ordem recebida, Sem centro] — SEL-02 AC4. */
export function scopeOptions(
  activeCenters: ReadonlyArray<Center>,
): Array<{ label: string; value: string }> {
  return [
    { label: ALL_LABEL, value: scopeKey(ALL_SCOPE) },
    ...activeCenters.map((center) => ({ label: center.name, value: scopeKey(centerScope(center)) })),
    { label: NONE_LABEL, value: scopeKey(NONE_SCOPE) },
  ]
}

/** Centro selecionado → ele; all/none → null. FORM-02 AC3/AC4. */
export function defaultFormCenter(
  scope: CenterScope,
  activeCenters: ReadonlyArray<Center>,
): Center | null {
  if (scope.kind !== 'center') return null
  return activeCenters.find((c) => c.id === scope.centerId) ?? null
}

/** Escopo `center` cujo centro não está mais ativo → ALL_SCOPE. SEL-03 AC7. */
export function reconcileScope(
  scope: CenterScope,
  activeCenters: ReadonlyArray<Center>,
): CenterScope {
  if (scope.kind !== 'center') return scope
  const stillActive = activeCenters.some((c) => c.id === scope.centerId)
  return stillActive ? scope : ALL_SCOPE
}

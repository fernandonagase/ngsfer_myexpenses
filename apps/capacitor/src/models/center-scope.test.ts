import { describe, expect, it } from 'vitest'

import type { Center } from 'src/databases/entities/expenses'

import {
  ALL_LABEL,
  ALL_SCOPE,
  NONE_LABEL,
  NONE_SCOPE,
  applyCenterScope,
  centerScopeWhere,
  defaultFormCenter,
  isSameScope,
  reconcileScope,
  scopeFromKey,
  scopeKey,
  scopeLabel,
  scopeOptions,
} from './center-scope'

function makeCenter(id: number, name: string): Center {
  return { id, name } as Center
}

describe('centerScopeWhere', () => {
  it('devolve null para o escopo all (sem filtro)', () => {
    expect(centerScopeWhere(ALL_SCOPE)).toBeNull()
  })

  it('devolve a igualdade por centerId para o escopo center', () => {
    expect(centerScopeWhere({ kind: 'center', centerId: 12 })).toEqual({
      sql: 'operation.centro_financeiro_id = :scopeCenterId',
      params: { scopeCenterId: 12 },
    })
  })

  it('devolve IS NULL para o escopo none', () => {
    expect(centerScopeWhere(NONE_SCOPE)).toEqual({
      sql: 'operation.centro_financeiro_id IS NULL',
      params: {},
    })
  })

  it('usa o alias informado', () => {
    expect(centerScopeWhere({ kind: 'center', centerId: 5 }, 'o')).toEqual({
      sql: 'o.centro_financeiro_id = :scopeCenterId',
      params: { scopeCenterId: 5 },
    })
  })
})

describe('applyCenterScope', () => {
  function makeSpyQb() {
    const calls: Array<{ sql: string; params: unknown }> = []
    const qb = {
      andWhere(sql: string, params: unknown) {
        calls.push({ sql, params })
        return qb
      },
    }
    return { qb, calls }
  }

  it('não aplica nada (não chama andWhere) em all', () => {
    const { qb, calls } = makeSpyQb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyCenterScope(qb as any, ALL_SCOPE)
    expect(calls).toHaveLength(0)
  })

  it('chama andWhere com a igualdade em center', () => {
    const { qb, calls } = makeSpyQb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyCenterScope(qb as any, { kind: 'center', centerId: 3 })
    expect(calls).toEqual([
      { sql: 'operation.centro_financeiro_id = :scopeCenterId', params: { scopeCenterId: 3 } },
    ])
  })

  it('chama andWhere (não where) com IS NULL em none', () => {
    const { qb, calls } = makeSpyQb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyCenterScope(qb as any, NONE_SCOPE)
    expect(calls).toEqual([{ sql: 'operation.centro_financeiro_id IS NULL', params: {} }])
  })
})

describe('scopeKey / scopeFromKey', () => {
  it('ida e volta para all', () => {
    expect(scopeFromKey(scopeKey(ALL_SCOPE))).toEqual(ALL_SCOPE)
  })

  it('ida e volta para center:12', () => {
    const scope = { kind: 'center' as const, centerId: 12 }
    expect(scopeKey(scope)).toBe('center:12')
    expect(scopeFromKey('center:12')).toEqual(scope)
  })

  it('ida e volta para none', () => {
    expect(scopeFromKey(scopeKey(NONE_SCOPE))).toEqual(NONE_SCOPE)
  })

  it('chave desconhecida devolve ALL_SCOPE', () => {
    expect(scopeFromKey('qualquer-coisa-invalida')).toEqual(ALL_SCOPE)
  })
})

describe('scopeOptions', () => {
  it('com 0 centros: só Todos e Sem centro, nessa ordem', () => {
    expect(scopeOptions([])).toEqual([
      { label: ALL_LABEL, value: 'all' },
      { label: NONE_LABEL, value: 'none' },
    ])
  })

  it('com 1 centro: Todos, o centro, Sem centro', () => {
    const centers = [makeCenter(1, 'Casa')]
    expect(scopeOptions(centers)).toEqual([
      { label: ALL_LABEL, value: 'all' },
      { label: 'Casa', value: 'center:1' },
      { label: NONE_LABEL, value: 'none' },
    ])
  })

  it('com 2 centros: mantém a ordem recebida entre Todos e Sem centro', () => {
    const centers = [makeCenter(2, 'Trabalho'), makeCenter(1, 'Casa')]
    expect(scopeOptions(centers)).toEqual([
      { label: ALL_LABEL, value: 'all' },
      { label: 'Trabalho', value: 'center:2' },
      { label: 'Casa', value: 'center:1' },
      { label: NONE_LABEL, value: 'none' },
    ])
  })
})

describe('scopeLabel', () => {
  const centers = [makeCenter(1, 'Casa')]

  it('all → Todos', () => {
    expect(scopeLabel(ALL_SCOPE, centers)).toBe('Todos')
  })

  it('center → nome do centro', () => {
    expect(scopeLabel({ kind: 'center', centerId: 1 }, centers)).toBe('Casa')
  })

  it('none → Sem centro', () => {
    expect(scopeLabel(NONE_SCOPE, centers)).toBe('Sem centro')
  })
})

describe('defaultFormCenter', () => {
  const centers = [makeCenter(1, 'Casa')]

  it('centro presente no escopo center → o centro', () => {
    expect(defaultFormCenter({ kind: 'center', centerId: 1 }, centers)).toEqual(centers[0])
  })

  it('all → null', () => {
    expect(defaultFormCenter(ALL_SCOPE, centers)).toBeNull()
  })

  it('none → null', () => {
    expect(defaultFormCenter(NONE_SCOPE, centers)).toBeNull()
  })
})

describe('reconcileScope', () => {
  const centers = [makeCenter(1, 'Casa')]

  it('centro ainda ativo: devolve o mesmo escopo', () => {
    const scope = { kind: 'center' as const, centerId: 1 }
    expect(isSameScope(reconcileScope(scope, centers), scope)).toBe(true)
  })

  it('centro inativado/removido: devolve ALL_SCOPE', () => {
    const scope = { kind: 'center' as const, centerId: 99 }
    expect(reconcileScope(scope, centers)).toEqual(ALL_SCOPE)
  })

  it('escopo all permanece inalterado', () => {
    expect(isSameScope(reconcileScope(ALL_SCOPE, centers), ALL_SCOPE)).toBe(true)
  })

  it('escopo none permanece inalterado', () => {
    expect(isSameScope(reconcileScope(NONE_SCOPE, centers), NONE_SCOPE)).toBe(true)
  })
})

describe('isSameScope', () => {
  it('compara por kind', () => {
    expect(isSameScope(ALL_SCOPE, NONE_SCOPE)).toBe(false)
  })

  it('compara por centerId quando kind é center', () => {
    expect(isSameScope({ kind: 'center', centerId: 1 }, { kind: 'center', centerId: 1 })).toBe(true)
    expect(isSameScope({ kind: 'center', centerId: 1 }, { kind: 'center', centerId: 2 })).toBe(false)
  })
})

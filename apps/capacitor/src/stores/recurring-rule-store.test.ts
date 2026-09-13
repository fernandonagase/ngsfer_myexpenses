import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { getErrorMessage } from 'src/helpers/error-handling'

// A store instancia o serviço no escopo do módulo, e o construtor real pede o repositório do
// datasource do app — que exige um Capacitor de verdade. Isolamos só o serviço: o que este
// arquivo testa é o elo entre o `IServiceResult` e a mensagem que a notificação exibe.
const { removeMock } = vi.hoisted(() => ({ removeMock: vi.fn() }))
vi.mock('src/services/typeorm-recurring-rule-service', () => ({
  TypeOrmRecurringRuleService: class {
    remove = removeMock
  },
}))

import { useRecurringRuleStore } from './recurring-rule-store'

beforeEach(() => {
  setActivePinia(createPinia())
  removeMock.mockReset()
})

describe('useRecurringRuleStore.remove', () => {
  it('não lança quando o serviço devolve ok', async () => {
    removeMock.mockResolvedValue({ ok: true, payload: undefined })

    await expect(useRecurringRuleStore().remove(1)).resolves.toBeUndefined()
  })

  it('leva a mensagem de origem do serviço até a legenda da notificação', async () => {
    removeMock.mockResolvedValue({ ok: false, message: 'exclusao bloqueada' })

    const erro = await useRecurringRuleStore()
      .remove(1)
      .catch((error: unknown) => error)

    // É o que a `RecurrencePage` faz com o erro: a legenda sai de `getErrorMessage`.
    expect(getErrorMessage(erro)).toBe('exclusao bloqueada')
  })
})

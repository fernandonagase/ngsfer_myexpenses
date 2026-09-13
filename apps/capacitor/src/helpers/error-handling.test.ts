import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import { getErrorMessage } from './error-handling'

describe('getErrorMessage', () => {
  it('usa a mensagem da causa quando existe', () => {
    const causa = { ok: false, message: 'FOREIGN KEY constraint failed' }
    const erro = new Error('Falha ao excluir regra de recorrência', { cause: causa })

    expect(getErrorMessage(erro)).toBe('FOREIGN KEY constraint failed')
  })

  it('usa a mensagem do próprio erro quando não há causa', () => {
    expect(getErrorMessage(new Error('Banco indisponível'))).toBe('Banco indisponível')
  })

  it('converte um valor que não é Error', () => {
    expect(getErrorMessage('texto solto')).toBe('texto solto')
  })
})

describe('RecurrencePage usa o helper compartilhado', () => {
  const source = readFileSync(resolve(__dirname, '../pages/RecurrencePage.vue'), 'utf8')

  it('RecurrencePage usa o helper compartilhado', () => {
    expect(source).toContain("from 'src/helpers/error-handling'")
    expect(source).toContain('getErrorMessage')
    expect(source).not.toContain('error instanceof Error ? error.message')
  })
})

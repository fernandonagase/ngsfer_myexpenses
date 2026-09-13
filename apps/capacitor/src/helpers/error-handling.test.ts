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

  it('usa a mensagem da causa quando a causa é um Error', () => {
    const causa = new Error('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed')
    const erro = new Error('Falha ao excluir regra de recorrência', { cause: causa })

    expect(getErrorMessage(erro)).toBe('SQLITE_CONSTRAINT: FOREIGN KEY constraint failed')
  })

  it('usa a mensagem do próprio erro quando não há causa', () => {
    expect(getErrorMessage(new Error('Banco indisponível'))).toBe('Banco indisponível')
  })

  it('usa a mensagem do próprio erro quando a causa não traz mensagem utilizável', () => {
    const comMensagemVazia = new Error('Falha ao salvar regra', { cause: { message: '' } })
    const comMensagemNaoTextual = new Error('Falha ao salvar regra', { cause: { message: 42 } })

    expect(getErrorMessage(comMensagemVazia)).toBe('Falha ao salvar regra')
    expect(getErrorMessage(comMensagemNaoTextual)).toBe('Falha ao salvar regra')
  })

  it('converte um valor que não é Error', () => {
    expect(getErrorMessage('texto solto')).toBe('texto solto')
  })
})

describe('ligação do helper com a tela de recorrências', () => {
  const source = readFileSync(resolve(__dirname, '../pages/RecurrencePage.vue'), 'utf8')

  it('RecurrencePage usa o helper compartilhado', () => {
    expect(source).toContain("import { getErrorMessage } from 'src/helpers/error-handling'")
    // A legenda da notificação é o ponto que a WOR-101 corrige: precisa ser o helper, não
    // qualquer outra expressão que apenas cite `error`.
    expect(source).toContain('caption: getErrorMessage(error)')
    expect(source).not.toContain('error instanceof Error ? error.message')
  })
})

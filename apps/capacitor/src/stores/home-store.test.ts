import { describe, expect, it } from 'vitest'

import { sumBySign } from './home-store'

describe('sumBySign', () => {
  it('retorna {0,0} para lista vazia', () => {
    expect(sumBySign([])).toEqual({ outflowsInCents: 0, inflowsInCents: 0 })
  })

  it('soma só negativos em outflowsInCents, inflowsInCents fica em 0', () => {
    expect(sumBySign([{ valueInCents: -100 }, { valueInCents: -250 }])).toEqual({
      outflowsInCents: -350,
      inflowsInCents: 0,
    })
  })

  it('soma só positivos em inflowsInCents, outflowsInCents fica em 0', () => {
    expect(sumBySign([{ valueInCents: 100 }, { valueInCents: 250 }])).toEqual({
      outflowsInCents: 0,
      inflowsInCents: 350,
    })
  })

  it('separa mistura de sinais nos dois lados', () => {
    expect(
      sumBySign([{ valueInCents: -100 }, { valueInCents: 300 }, { valueInCents: -50 }]),
    ).toEqual({ outflowsInCents: -150, inflowsInCents: 300 })
  })

  it('item com valueInCents === 0 não soma em nenhum lado', () => {
    expect(sumBySign([{ valueInCents: 0 }, { valueInCents: -100 }])).toEqual({
      outflowsInCents: -100,
      inflowsInCents: 0,
    })
  })

  it('fatura com soma positiva para o centro conta como entrada agendada (Edge Cases)', () => {
    // representa a linha derivada de uma fatura cujo total no centro é positivo
    expect(sumBySign([{ valueInCents: 500 }])).toEqual({
      outflowsInCents: 0,
      inflowsInCents: 500,
    })
  })
})

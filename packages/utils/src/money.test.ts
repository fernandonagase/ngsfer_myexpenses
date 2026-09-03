import { describe, expect, it } from 'vitest'

import { splitInInstallments } from './money'

describe('splitInInstallments', () => {
  it('divide o total igualmente quando é divisível pela quantidade', () => {
    expect(splitInInstallments(1000, 2)).toEqual([500, 500])
  })

  it('distribui o resto nas últimas parcelas', () => {
    expect(splitInInstallments(1000, 3)).toEqual([333, 333, 334])
  })

  it('preserva o sinal para valores negativos', () => {
    expect(splitInInstallments(-1000, 3)).toEqual([-333, -333, -334])
  })

  it('lança erro se totalInCents não for inteiro', () => {
    expect(() => splitInInstallments(10.5, 2)).toThrow('totalInCents deve ser inteiro (em centavos)')
  })

  it('lança erro se count não for inteiro positivo', () => {
    expect(() => splitInInstallments(1000, 0)).toThrow('count deve ser inteiro >= 1')
    expect(() => splitInInstallments(1000, 1.5)).toThrow('count deve ser inteiro >= 1')
  })
})

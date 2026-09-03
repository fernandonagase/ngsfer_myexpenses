import { describe, expect, it } from 'vitest'

import { getWeekdayName } from './dates'

describe('getWeekdayName', () => {
  it('retorna o nome do dia da semana em português', () => {
    expect(getWeekdayName(0)).toBe('domingo')
    expect(getWeekdayName(1)).toBe('segunda')
    expect(getWeekdayName(6)).toBe('sábado')
  })
})

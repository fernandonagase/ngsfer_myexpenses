const weekdays = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado'
] as const

function getWeekdayName(day: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  return weekdays[day]
}

export { getWeekdayName }
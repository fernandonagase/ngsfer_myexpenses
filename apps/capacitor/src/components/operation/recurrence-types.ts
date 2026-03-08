export const recurrenceTypeOptions = [
  {
    value: 'one-time',
    label: 'À vista',
  },
  {
    value: 'installments',
    label: 'A prazo',
  },
  {
    value: 'recurring',
    label: 'Recorrente',
  },
]

export type RecurrenceType = (typeof recurrenceTypeOptions)[number]['value']

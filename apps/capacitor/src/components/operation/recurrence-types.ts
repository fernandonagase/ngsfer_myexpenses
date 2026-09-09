export const recurrenceTypeOptions = [
  {
    value: 'one-time',
    label: 'Único',
  },
  {
    value: 'installments',
    label: 'Parcelado',
  },
  {
    value: 'recurring',
    label: 'Recorrente',
  },
]

export type RecurrenceType = (typeof recurrenceTypeOptions)[number]['value']

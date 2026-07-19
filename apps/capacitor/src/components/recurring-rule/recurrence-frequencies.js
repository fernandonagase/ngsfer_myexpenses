import { FrequencyType } from "src/databases/entities/expenses/recurring-rule"

export const recurrenceFrequencyOptions = [
  {
    value: FrequencyType.WEEKLY,
    label: 'Semanalmente',
  },
  {
    value: FrequencyType.MONTHLY,
    label: 'Mensalmente',
  },
]

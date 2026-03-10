import { Dialog } from 'quasar'
import { BRL } from '@ngsfer-myexpenses/utils'

import type {
  IRecurringRuleController,
  ShowAddRecurringRulePayload,
  ShowEditRecurringRulePayload,
} from './types/IRecurringRuleController'
import RecurringRuleDialog from 'src/components/recurring-rule/RecurringRuleDialog.vue'
import AddRecurringRuleDialog from 'src/components/recurring-rule/AddRecurringRuleDialog.vue'
import { type RecurringRule } from 'src/domain/RecurringRule'

export class QuasarRecurringRuleController implements IRecurringRuleController {
  showAddRecurringRule({
    addCallback,
  }: {
    addCallback: (payload: ShowAddRecurringRulePayload) => void
  }): void {
    Dialog.create({
      component: AddRecurringRuleDialog,
      componentProps: {},
      persistent: true,
    }).onOk((payload: ShowAddRecurringRulePayload) => {
      addCallback(payload)
    })
  }
  showEditRecurringRule(
    recurringRule: RecurringRule,
    { editCallback }: { editCallback: (payload: ShowEditRecurringRulePayload) => void },
  ): void {
    Dialog.create({
      component: RecurringRuleDialog,
      componentProps: {
        value: BRL(Math.abs(recurringRule.valueInCents) / 100).format(),
        date: recurringRule.startDate,
        category: recurringRule.category,
        description: recurringRule.description,
        operationType: recurringRule.isExpense ? 'Saída' : 'Entrada',
        recurrenceFrequency: recurringRule.frequency,
        isActive: recurringRule.isActive,
      },
      persistent: true,
    }).onOk((payload: ShowEditRecurringRulePayload) => {
      editCallback(payload)
    })
  }
}

<script setup lang="ts">
import dayjs from 'dayjs'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RecurringRuleItem from 'src/components/recurring-rule/RecurringRuleItem.vue'
import { QuasarRecurringRuleController } from 'src/controllers/quasar-recurring-rule-controller'
import type {
  IRecurringRuleController,
  ShowEditRecurringRulePayload,
} from 'src/controllers/types/IRecurringRuleController'
import { RecurringRule } from 'src/domain/RecurringRule'
import { useRecurringRuleStore } from 'src/stores/recurring-rule-store'

const recurringRuleStore = useRecurringRuleStore()
const recurringRuleController: IRecurringRuleController = new QuasarRecurringRuleController()

await recurringRuleStore.fetchRecurringRules({ relations: ['category', 'center'] })

function editRecurringRuleGenerator(recurringRule: RecurringRule) {
  return async (payload: ShowEditRecurringRulePayload) => {
    const model = new RecurringRule({ ...recurringRule })
    Object.assign(model, payload)
    await recurringRuleStore.save(model)
  }
}
</script>

<template>
  <q-page>
    <ErrorBoundary>
      <q-list>
        <RecurringRuleItem
          v-for="recurringRule in recurringRuleStore.recurringRules"
          :key="recurringRule.id"
          :description="recurringRule.description"
          :category-name="recurringRule.category!.name"
          :value="`${recurringRule.valueString}`"
          :recurring-rule-type="recurringRule.ruleType"
          :frequency="recurringRule.frequency"
          :monthly-anchor-day="recurringRule.anchorDay"
          :weekly-anchor-day="dayjs(recurringRule.startDate).day()"
          @click="
            recurringRuleController.showEditRecurringRule(recurringRule, {
              editCallback: editRecurringRuleGenerator(recurringRule),
            })
          "
        />
      </q-list>
    </ErrorBoundary>
  </q-page>
</template>

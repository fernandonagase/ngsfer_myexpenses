<script setup lang="ts">
import dayjs from 'dayjs'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RecurringRuleItem from 'src/components/recurring-rule/RecurringRuleItem.vue'
import { QuasarRecurringRuleController } from 'src/controllers/quasar-recurring-rule-controller'
import type {
  IRecurringRuleController,
  ShowAddRecurringRulePayload,
  ShowEditRecurringRulePayload,
} from 'src/controllers/types/IRecurringRuleController'
import { RecurringRule } from 'src/domain/RecurringRule'
import { useRecurringRuleStore } from 'src/stores/recurring-rule-store'
import { useOperationStore } from 'src/stores/operation-store'
import { useCenterStore } from 'src/stores/center-store'
import { defaultFormCenter } from 'src/models/center-scope'
import { notificationService } from 'src/services/notification-service'

const recurringRuleStore = useRecurringRuleStore()
const operationStore = useOperationStore()
const centerStore = useCenterStore()
const recurringRuleController: IRecurringRuleController = new QuasarRecurringRuleController()

await recurringRuleStore.fetchRecurringRules({ relations: ['category', 'center'] })

function editRecurringRuleGenerator(recurringRule: RecurringRule) {
  return async (payload: ShowEditRecurringRulePayload) => {
    const model = new RecurringRule({ ...recurringRule })
    Object.assign(model, payload)
    await recurringRuleStore.save(model)
    await recurringRuleStore.fetchRecurringRules({ relations: ['category', 'center'] })
    await notificationService.rescheduleAll()
  }
}

async function addRecurringRule(payload: ShowAddRecurringRulePayload) {
  const model = new RecurringRule({ ...payload })
  await recurringRuleStore.insert(model)
  await recurringRuleStore.generateRecurringOperationsForCurrentWindow()
  await recurringRuleStore.fetchRecurringRules({ relations: ['category', 'center'] })
  await notificationService.rescheduleAll()
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
          :is-active="recurringRule.isActive"
          @click="
            recurringRuleController.showEditRecurringRule(recurringRule, {
              editCallback: editRecurringRuleGenerator(recurringRule),
            })
          "
        />
      </q-list>
      <q-page-sticky position="bottom-right" :offset="[18, 18]">
        <q-btn
          fab
          icon="add"
          color="primary"
          @click="
            recurringRuleController.showAddRecurringRule({
              addCallback: addRecurringRule,
              defaultCenter: defaultFormCenter(operationStore.scope, centerStore.activeCenters),
            })
          "
        />
      </q-page-sticky>
    </ErrorBoundary>
  </q-page>
</template>

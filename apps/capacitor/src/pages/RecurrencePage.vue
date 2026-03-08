<script setup lang="ts">
import dayjs from 'dayjs'

import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RecurringRuleItem from 'src/components/recurring-rule/RecurringRuleItem.vue'
import { useRecurringRuleStore } from 'src/stores/recurring-rule-store'

const recurringRuleStore = useRecurringRuleStore()

await recurringRuleStore.fetchRecurringRules({ withCategory: true, withCenter: true })
</script>

<template>
  <q-page>
    <ErrorBoundary>
      <q-list>
        <RecurringRuleItem
          v-for="recurringRule in recurringRuleStore.recurringRules"
          :key="recurringRule.id"
          :description="recurringRule.description"
          :category-name="recurringRule.category.name"
          :value="`${recurringRule.valueString}`"
          :recurring-rule-type="recurringRule.ruleType"
          :frequency="recurringRule.frequency"
          :monthly-anchor-day="recurringRule.anchorDay"
          :weekly-anchor-day="dayjs(recurringRule.startDate).day()"
        />
      </q-list>
    </ErrorBoundary>
  </q-page>
</template>

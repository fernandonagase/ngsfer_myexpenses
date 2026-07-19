<script setup lang="ts">
import { computed } from 'vue'
import { getWeekdayName } from '@ngsfer-myexpenses/utils'

import { FrequencyType, RecurringRuleType } from 'src/databases/entities/expenses/recurring-rule'
import ConcealableValue from '../ConcealableValue.vue'

interface RecurringRuleItemProps {
  description?: string | undefined
  categoryName: string
  value: string
  recurringRuleType: RecurringRuleType
  frequency: FrequencyType
  monthlyAnchorDay?: number | undefined
  weeklyAnchorDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  isActive?: boolean
}

const props = withDefaults(defineProps<RecurringRuleItemProps>(), {
  isActive: true,
})
defineEmits(['click'])

const isExpense = computed(() => props.recurringRuleType === RecurringRuleType.EXPENSE)

function getWeekday(day: 0 | 1 | 2 | 3 | 4 | 5 | 6) {
  return getWeekdayName(day)
}
</script>

<template>
  <q-item clickable v-ripple @click="$emit('click')">
    <q-item-section>
      <q-item-label class="text-body1">
        <span v-if="description">{{ description }}</span>
        <span v-else>Não identificada</span>
        <q-badge v-if="!isActive" color="red" class="q-ml-sm">Inativa</q-badge>
      </q-item-label>
      <q-item-label caption>{{ categoryName }}</q-item-label>
      <q-item-label caption>
        <q-icon name="repeat" />
        Repete
        <template v-if="frequency === FrequencyType.WEEKLY">
          toda(o) {{ getWeekday(weeklyAnchorDay!) }}
        </template>
        <template v-if="frequency === FrequencyType.MONTHLY">
          todo dia {{ monthlyAnchorDay }}
        </template>
      </q-item-label>
    </q-item-section>
    <q-item-section side>
      <ConcealableValue>
        <span class="text-body2" :class="isExpense ? 'text-black' : 'text-positive'">
          {{ isExpense ? '' : '+' }}{{ value }}
        </span>
      </ConcealableValue>
    </q-item-section>
  </q-item>
</template>

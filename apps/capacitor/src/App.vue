<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { IRecurringRuleService } from './services/types/IRecurringRuleService'
import { TypeOrmRecurringRuleService } from './services/typeorm-recurring-rule-service'

onMounted(async () => {
  const recurringRuleService: IRecurringRuleService = new TypeOrmRecurringRuleService()
  const ret = await recurringRuleService.list({ filters: { isActive: true } })
  if (ret.ok) {
    console.log(ret.payload)
  }
})
</script>

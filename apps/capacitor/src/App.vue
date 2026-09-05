<template>
  <Suspense>
    <router-view />
    <template #fallback> Carregando... </template>
  </Suspense>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import type { IRecurringRuleService } from './services/types/IRecurringRuleService'
import { TypeOrmRecurringRuleService } from './services/typeorm-recurring-rule-service'
import { notificationService } from './services/notification-service'

onMounted(async () => {
  const recurringRuleService: IRecurringRuleService = new TypeOrmRecurringRuleService()
  await recurringRuleService.generateRecurringOperationsForCurrentWindow()
  await notificationService.rescheduleAll()
})
</script>

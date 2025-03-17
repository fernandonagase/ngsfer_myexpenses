<script setup lang="ts">
import dayjs from 'dayjs'
import { computed } from 'vue'

import { BRL } from 'src/helpers/currency'
import { useOperationStore } from 'src/stores/operation-store'
import ConcealableValue from 'src/components/ConcealableValue.vue'

const operationStore = useOperationStore()

const totalForMonth = computed(() =>
  operationStore.month
    ? BRL(operationStore.summaryByMonth.get(operationStore.month)!.finalBalance / 100).format()
    : 0,
)
</script>

<template>
  <q-page>
    <q-tabs v-model="operationStore.month">
      <q-tab
        v-for="month in operationStore.months"
        :key="month.value"
        :name="month.value"
        :label="month.label"
      />
    </q-tabs>
    <q-list
      v-if="operationStore.month && operationStore.summaryByMonth.get(operationStore.month)"
      class="operations-list"
    >
      <q-item>
        <q-item-section>
          <q-item-label class="text-weight-bold">Total</q-item-label>
        </q-item-section>
        <q-item-section side>
          <ConcealableValue>
            <span>{{ totalForMonth }}</span>
          </ConcealableValue>
        </q-item-section>
      </q-item>
      <template
        v-for="[day, operations] in Object.entries(operationStore.monthOperations)"
        :key="day"
      >
        <q-item>
          <q-item-section>
            <q-item-label class="text-weight-bold">{{
              dayjs(day).format('ddd[.], D [de] MMMM [de] YYYY')
            }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-for="operation in operations" :key="operation.id">
          <q-item-section>
            <q-item-label>
              <span v-if="operation.description">{{ operation.description }}</span>
              <span v-else>Não identificada</span>
              <q-badge :label="operation.category.name" class="q-ml-sm" />
            </q-item-label>
            <q-item-label caption>{{ operation.dateString }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <ConcealableValue>
              <span :class="operation.isExpense ? 'text-negative' : 'text-positive'">
                {{ operation.valueString }}
              </span>
            </ConcealableValue>
          </q-item-section>
          <q-item-section side>
            <q-btn icon="more_vert" size="12px" flat dense round>
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="operationStore.editOperation(operation)">
                    <q-item-section>Editar</q-item-section>
                    <q-item-section side>
                      <q-icon name="edit" size="xs" />
                    </q-item-section>
                  </q-item>
                  <q-item
                    clickable
                    v-close-popup
                    @click="operationStore.removeOperation(operation)"
                  >
                    <q-item-section>Excluir</q-item-section>
                    <q-item-section side>
                      <q-icon name="delete" size="xs" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
      </template>
      <q-item>
        <q-item-section>
          <q-item-label class="text-weight-bold">Saldo anterior</q-item-label>
        </q-item-section>
        <q-item-section side>
          <ConcealableValue>
            <span>{{
              BRL(
                operationStore.summaryByMonth.get(operationStore.month)!.initialBalance / 100,
              ).format()
            }}</span>
          </ConcealableValue>
        </q-item-section>
      </q-item>
    </q-list>
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="accent" @click="operationStore.addOperation()" />
    </q-page-sticky>
  </q-page>
</template>

<style lang="scss" scoped>
.operations-list {
  padding-bottom: 82px;
}
</style>

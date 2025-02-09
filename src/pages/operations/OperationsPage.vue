<template>
  <q-page>
    <q-list separator class="operations-list">
      <q-item v-for="operation in operationStore.operations" :key="operation.id">
        <q-item-section>
          <q-item-label>
            <span v-if="operation.description">{{ operation.description }}</span>
            <span v-else>Não identificada</span>
            <q-badge :label="operation.category.name" class="q-ml-sm" />
          </q-item-label>
          <q-item-label caption>{{ operation.dateString }}</q-item-label>
        </q-item-section>
        <q-item-section side :class="operation.isExpense ? 'text-negative' : 'text-positive'">
          {{ operation.valueString }}
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
                <q-item clickable v-close-popup @click="operationStore.removeOperation(operation)">
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
      <q-item>
        <q-item-section>
          <q-item-label class="text-weight-bold">Total</q-item-label>
        </q-item-section>
        <q-item-section side>
          {{ BRL(operationStore.totalInCents / 100).format() }}
        </q-item-section>
      </q-item>
    </q-list>
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="accent" @click="operationStore.addOperation()" />
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { BRL } from 'src/helpers/currency'
import { useOperationStore } from 'src/stores/operation-store'

const operationStore = useOperationStore()
</script>

<style lang="scss" scoped>
.operations-list {
  padding-bottom: 82px;
}
</style>

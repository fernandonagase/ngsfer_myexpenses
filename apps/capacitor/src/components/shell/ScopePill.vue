<script setup lang="ts">
import { useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'
import { scopeFromKey, scopeKey, scopeOptions } from 'src/models/center-scope'

const centerStore = useCenterStore()
const operationStore = useOperationStore()
</script>

<template>
  <div v-if="centerStore.hasActiveCenters" class="scope-pill" role="button" tabindex="0">
    <q-icon name="account_balance_wallet" size="18px" />
    <span class="scope-pill__label">{{ operationStore.scopeLabel }}</span>
    <q-icon name="expand_more" size="18px" class="scope-pill__caret" />
    <q-menu auto-close anchor="bottom left" self="top left" class="scope-pill__menu">
      <q-list style="min-width: 200px">
        <q-item
          v-for="option in scopeOptions(centerStore.activeCenters)"
          :key="option.value"
          clickable
          :active="option.value === scopeKey(operationStore.scope)"
          active-class="text-primary text-weight-bold"
          @click="operationStore.setScope(scopeFromKey(option.value))"
        >
          <q-item-section>{{ option.label }}</q-item-section>
          <q-item-section v-if="option.value === scopeKey(operationStore.scope)" side>
            <q-icon name="check" color="primary" size="18px" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
  <div v-else class="scope-pill scope-pill--static">
    <q-icon name="account_balance_wallet" size="18px" />
    <span class="scope-pill__label">Plumifin</span>
  </div>
</template>

<style lang="scss" scoped>
.scope-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--ds-header-pill);
  border-radius: 999px;
  padding: 6px 12px 6px 8px;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  user-select: none;
  max-width: 60vw;
}

.scope-pill--static {
  cursor: default;
}

.scope-pill__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scope-pill__caret {
  margin-left: -2px;
}
</style>

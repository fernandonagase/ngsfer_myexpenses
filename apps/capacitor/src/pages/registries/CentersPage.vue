<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import BottomCta from 'src/components/shell/BottomCta.vue'
import ActionSheetDialog, { type SheetAction } from 'src/components/ActionSheetDialog.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RegistryEmptyState from 'src/components/RegistryEmptyState.vue'
import type { Center } from 'src/databases/entities/expenses'
import { MAX_ACTIVE_CENTERS, useCenterStore } from 'src/stores/center-store'
import { useOperationStore } from 'src/stores/operation-store'

const $q = useQuasar()
const centerStore = useCenterStore()
const operationStore = useOperationStore()

const counts = ref<Record<number, number>>({})

const isEmpty = computed(() => centerStore.centers.length === 0)

const heroValue = computed(
  () => `${centerStore.activeCenters.length} de ${MAX_ACTIVE_CENTERS} possíveis`,
)

function isCurrent(center: Center) {
  const scope = operationStore.scope
  return scope.kind === 'center' && scope.centerId === center.id
}

function countOf(center: Center) {
  return counts.value[center.id] ?? 0
}

function metaOf(center: Center) {
  const count = countOf(center)
  const ops = `${count} ${count === 1 ? 'operação' : 'operações'}`
  return isCurrent(center) ? `Em uso na tela inicial · ${ops}` : ops
}

async function load() {
  await centerStore.fetchCenters()
  counts.value = await centerStore.countOperationsByCenter()
}

onMounted(load)

watch(
  () => operationStore.dataRevision,
  () => {
    void load()
  },
)

async function afterOperationsChanged(changed: boolean) {
  if (!changed) return
  await operationStore.refreshScreen()
}

function openActions(center: Center) {
  const actions: SheetAction[] = [
    { value: 'edit', label: 'Editar', icon: 'edit' },
    center.isActive
      ? { value: 'deactivate', label: 'Inativar', icon: 'block' }
      : { value: 'reactivate', label: 'Reativar', icon: 'check_circle' },
    { value: 'delete', label: 'Excluir', icon: 'delete', danger: true },
  ]

  $q.dialog({
    component: ActionSheetDialog,
    componentProps: { title: center.name, meta: metaOf(center), actions },
  }).onOk((action: string) => {
    if (action === 'edit') centerStore.editCenter(center)
    else if (action === 'deactivate') {
      void centerStore.softRemoveCenter(center).then(afterOperationsChanged)
    } else if (action === 'reactivate') {
      void centerStore.reactivateCenter(center).then(afterOperationsChanged)
    } else if (action === 'delete') {
      void centerStore.removeCenter(center, countOf(center)).then(afterOperationsChanged)
    }
  })
}
</script>

<template>
  <q-page class="centers-page">
    <ScreenHeader title="Centros financeiros" back hide-eye>
      <template #hero>
        <div class="screen-header__caption">Centros ativos</div>
        <div class="screen-header__value">{{ heroValue }}</div>
      </template>
    </ScreenHeader>

    <ScreenBody bottom-padding="110px">
      <ErrorBoundary>
        <RegistryEmptyState
          v-if="isEmpty"
          icon="account_balance"
          title="Nenhum centro financeiro"
          body="Centros separam suas finanças — pessoal, família, empresa. Cada operação pertence a um centro e a tela inicial mostra um por vez."
          add-label="Novo centro"
          :hint="`Você pode ter até ${MAX_ACTIVE_CENTERS} centros ativos; comece com &quot;Pessoal&quot;.`"
          @add="centerStore.addCenter()"
        />

        <template v-else>
          <div class="ds-card list">
            <div
              v-for="center in centerStore.centers"
              :key="center.id"
              class="ds-row ds-row--clickable"
              :class="{ 'list__row--inactive': !center.isActive }"
              @click="openActions(center)"
            >
              <div class="ds-avatar" :class="{ 'list__avatar--current': isCurrent(center) }">
                <q-icon name="account_balance" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="list__title-row">
                  <span class="ds-row__title">{{ center.name }}</span>
                  <span v-if="!center.isActive" class="ds-badge ds-badge--neutral ds-badge--tag">
                    Inativo
                  </span>
                </div>
                <div class="ds-row__meta">{{ metaOf(center) }}</div>
              </div>
              <q-icon name="more_horiz" size="20px" class="ds-chevron" />
            </div>
          </div>
          <div class="ds-hint list__hint">
            Centros separam suas finanças (pessoal, família, empresa). Cada operação pertence a um
            centro; a tela inicial mostra um por vez.
          </div>
        </template>
      </ErrorBoundary>
    </ScreenBody>

    <BottomCta v-if="!isEmpty">
      <button
        v-if="centerStore.canAddCenter"
        type="button"
        class="ds-block-btn ds-block-btn--primary bottom-cta__primary"
        @click="centerStore.addCenter()"
      >
        <q-icon name="add" size="20px" />
        Novo centro
      </button>
      <div v-else class="bottom-cta__note">
        <q-icon name="info" size="18px" />
        Limite de {{ MAX_ACTIVE_CENTERS }} centros atingido · inative um para criar outro
      </div>
    </BottomCta>
  </q-page>
</template>

<style lang="scss" scoped>
.centers-page {
  background: var(--ds-surface);
}

.list {
  overflow: hidden;
}

.list__row--inactive {
  opacity: 0.62;
}

.list__avatar--current {
  background: var(--ds-header);
  color: #fff;
}

.list__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.list__hint {
  padding: 0 4px;
}
</style>

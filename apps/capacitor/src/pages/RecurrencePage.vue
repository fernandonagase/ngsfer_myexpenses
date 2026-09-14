<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { BRL, getWeekdayName } from '@plumifin/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import BottomCta from 'src/components/shell/BottomCta.vue'
import ActionSheetDialog, { type SheetAction } from 'src/components/ActionSheetDialog.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import ConfirmSheetDialog from 'src/components/ConfirmSheetDialog.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import RegistryEmptyState from 'src/components/RegistryEmptyState.vue'
import { QuasarRecurringRuleController } from 'src/controllers/quasar-recurring-rule-controller'
import type {
  IRecurringRuleController,
  ShowEditRecurringRulePayload,
} from 'src/controllers/types/IRecurringRuleController'
import { RecurringRule } from 'src/domain/RecurringRule'
import { categoryIcon } from 'src/helpers/category-icons'
import { getErrorMessage } from 'src/helpers/error-handling'
import { notificationService } from 'src/services/notification-service'
import type { WithRequiredId } from 'src/services/types/IService'
import { useOperationStore } from 'src/stores/operation-store'
import { useRecurringRuleStore } from 'src/stores/recurring-rule-store'

type Rule = WithRequiredId<RecurringRule>

const $q = useQuasar()
const recurringRuleStore = useRecurringRuleStore()
const operationStore = useOperationStore()
const recurringRuleController: IRecurringRuleController = new QuasarRecurringRuleController()

const loading = ref(true)

const fmt = (cents: number) => BRL(Math.abs(cents) / 100).format()
const signed = (cents: number) => `${cents > 0 ? '+' : cents < 0 ? '-' : ''}${fmt(cents)}`

const rules = computed(() => recurringRuleStore.recurringRules)
const isEmpty = computed(() => rules.value.length === 0)

/** Estimativa mensal: regras semanais contam 52/12 ocorrências por mês. */
function monthlyOf(rule: Rule) {
  const interval = Math.max(1, rule.interval)
  if (rule.isWeekly) return (rule.valueInCents * (52 / 12)) / interval
  return rule.valueInCents / interval
}

const monthlyTotal = computed(() =>
  Math.round(rules.value.filter((r) => r.isActive).reduce((sum, r) => sum + monthlyOf(r), 0)),
)

function whenOf(rule: Rule) {
  if (rule.isWeekly && rule.weeklyAnchorDay != null) {
    return `toda(o) ${getWeekdayName(rule.weeklyAnchorDay)}`
  }
  if (rule.isMonthly) return `todo dia ${rule.anchorDay}`
  return 'todo ano'
}

function metaOf(rule: Rule) {
  return `${rule.category?.name ?? 'Sem categoria'} · ${whenOf(rule)}`
}

async function load() {
  loading.value = true
  try {
    await recurringRuleStore.fetchRecurringRules({ relations: ['category', 'center'] })
  } finally {
    loading.value = false
  }
}

onMounted(load)

watch(
  () => operationStore.dataRevision,
  () => {
    void load()
  },
)

function notifyError(message: string, error: unknown) {
  $q.notify({
    type: 'negative',
    message,
    caption: getErrorMessage(error),
  })
}

async function saveRule(rule: Rule, patch: Partial<ShowEditRecurringRulePayload>) {
  const model = new RecurringRule({ ...rule })
  Object.assign(model, patch)
  await recurringRuleStore.save(model)
  await load()
  await notificationService.rescheduleAll()
}

function editRule(rule: Rule) {
  recurringRuleController.showEditRecurringRule(rule, {
    editCallback: (payload: ShowEditRecurringRulePayload) => {
      saveRule(rule, payload)
        .then(() => $q.notify({ type: 'positive', message: 'Alterações salvas' }))
        .catch((error) => notifyError('Falha ao salvar regra', error))
    },
  })
}

function toggleRule(rule: Rule) {
  const next = !rule.isActive
  saveRule(rule, { isActive: next })
    .then(() =>
      $q.notify({
        type: 'positive',
        message: `"${rule.description}" ${next ? 'retomada' : 'pausada'}`,
      }),
    )
    .catch((error) => notifyError(next ? 'Falha ao retomar regra' : 'Falha ao pausar regra', error))
}

function removeRule(rule: Rule) {
  $q.dialog({
    component: ConfirmSheetDialog,
    componentProps: {
      title: 'Excluir regra?',
      message: 'As operações já geradas ficam; nenhuma nova será criada.',
      confirmLabel: 'Excluir',
      destructive: true,
    },
  }).onOk(() => {
    recurringRuleStore
      .remove(rule.id)
      .then(async () => {
        await load()
        await operationStore.refreshScreen()
        await notificationService.rescheduleAll()
        $q.notify({ type: 'positive', message: 'Regra de recorrência excluída' })
      })
      .catch((error) => notifyError('Falha ao excluir regra', error))
  })
}

function openActions(rule: Rule) {
  const actions: SheetAction[] = [
    { value: 'edit', label: 'Editar', icon: 'edit' },
    rule.isActive
      ? { value: 'toggle', label: 'Pausar', icon: 'pause_circle' }
      : { value: 'toggle', label: 'Retomar', icon: 'play_circle' },
    { value: 'delete', label: 'Excluir', icon: 'delete', danger: true },
  ]

  $q.dialog({
    component: ActionSheetDialog,
    componentProps: { title: rule.description || 'Não identificada', meta: metaOf(rule), actions },
  }).onOk((action: string) => {
    if (action === 'edit') editRule(rule)
    else if (action === 'toggle') toggleRule(rule)
    else if (action === 'delete') removeRule(rule)
  })
}

function addRule() {
  operationStore.addOperation({
    recurrenceType: 'recurring',
    title: 'Nova regra',
    lockRecurrenceType: true,
  })
}
</script>

<template>
  <q-page class="recurrence-page">
    <ScreenHeader title="Operações recorrentes" back>
      <template #hero>
        <div class="screen-header__caption">Saldo recorrente por mês</div>
        <ConcealableValue concealed-class="screen-header__value">
          <div
            class="screen-header__value"
            :class="{ 'screen-header__value--negative': monthlyTotal < 0 }"
          >
            {{ signed(monthlyTotal) }}
          </div>
        </ConcealableValue>
      </template>
    </ScreenHeader>

    <ScreenBody bottom-padding="110px">
      <ErrorBoundary>
        <div v-if="loading" class="ds-card ds-empty">Carregando regras...</div>

        <RegistryEmptyState
          v-else-if="isEmpty"
          icon="event_repeat"
          title="Nenhuma regra recorrente"
          body="Regras lançam sozinhas o que se repete — aluguel, salário, assinaturas — e entram na previsão do mês."
          add-label="Nova regra"
          hint='Toda operação com "Repetir" ligado vira uma regra e aparece nesta lista.'
          @add="addRule()"
        />

        <template v-else>
          <div class="ds-card list">
            <div
              v-for="rule in rules"
              :key="rule.id"
              class="ds-row ds-row--clickable"
              :class="{ 'list__row--inactive': !rule.isActive }"
              @click="openActions(rule)"
            >
              <div class="ds-avatar">
                <q-icon :name="categoryIcon(rule.category?.name)" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="list__title-row">
                  <span class="ds-row__title">{{ rule.description || 'Não identificada' }}</span>
                  <span v-if="!rule.isActive" class="ds-badge ds-badge--neutral ds-badge--tag">
                    Pausada
                  </span>
                </div>
                <div class="ds-row__meta">{{ metaOf(rule) }}</div>
              </div>
              <ConcealableValue concealed-class="list__value">
                <span class="list__value" :class="{ 'list__value--income': rule.isIncome }">
                  {{ signed(rule.valueInCents) }}
                </span>
              </ConcealableValue>
            </div>
          </div>
          <div class="ds-hint list__hint">
            Regras geram operações agendadas automaticamente. Total previsto por mês:
            <ConcealableValue concealed-class="list__hint-strong">
              <strong class="list__hint-strong">{{ signed(monthlyTotal) }}</strong>
            </ConcealableValue>
            .
          </div>
        </template>
      </ErrorBoundary>
    </ScreenBody>

    <BottomCta v-if="!loading && !isEmpty">
      <button
        type="button"
        class="ds-block-btn ds-block-btn--primary bottom-cta__primary"
        @click="addRule()"
      >
        <q-icon name="add" size="20px" />
        Nova regra
      </button>
    </BottomCta>
  </q-page>
</template>

<style lang="scss" scoped>
.recurrence-page {
  background: var(--ds-surface);
}

.list {
  overflow: hidden;
}

.list__row--inactive {
  opacity: 0.62;
}

.list__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.list__value {
  font-size: 14px;
  font-weight: 700;
  color: var(--ds-ink);
  white-space: nowrap;
}

.list__value--income {
  color: var(--ds-income);
}

.list__hint {
  padding: 0 4px;
}

.list__hint-strong {
  font-weight: 700;
  color: #5c6b66;
}
</style>

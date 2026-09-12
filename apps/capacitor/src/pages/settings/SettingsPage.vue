<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import ConfirmSheetDialog from 'src/components/ConfirmSheetDialog.vue'
import ErrorBoundary from 'src/components/ErrorBoundary.vue'
import { actWithDbConnectionStopped } from 'src/databases/datasources/ExpensesDatasource'
import { backup, importBackup } from 'src/services/backup-service'
import { notificationService } from 'src/services/notification-service'
import { useCategoryStore } from 'src/stores/category-store'
import { useCenterStore } from 'src/stores/center-store'
import { useCardStore } from 'src/stores/card-store'
import { useConfigStore } from 'src/stores/config-store'
import { useInvoiceStore, type InvoicesOverview } from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'
import { useRecurringRuleStore } from 'src/stores/recurring-rule-store'

const $q = useQuasar()
const router = useRouter()

const centerStore = useCenterStore()
const categoryStore = useCategoryStore()
const cardStore = useCardStore()
const configStore = useConfigStore()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()
const recurringRuleStore = useRecurringRuleStore()

const appVersion = process.env.APP_VERSION ?? ''

const overview = ref<InvoicesOverview | null>(null)

async function loadCounts() {
  await Promise.all([cardStore.fetchCards(), recurringRuleStore.fetchRecurringRules()])
  overview.value = await invoiceStore.getInvoicesOverview()
}

onMounted(loadCounts)

watch(
  () => operationStore.dataRevision,
  () => {
    void loadCounts()
  },
)

const hasCards = computed(() => cardStore.activeCards.length > 0)

const activeRulesCount = computed(
  () => recurringRuleStore.recurringRules.filter((rule) => rule.isActive).length,
)

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

const registries = computed(() => [
  {
    icon: 'account_balance',
    label: 'Centros financeiros',
    meta: centerStore.activeCenters.length
      ? plural(centerStore.activeCenters.length, 'ativo', 'ativos')
      : 'Nenhum cadastrado',
    action: () => centerStore.showCenters(),
  },
  {
    icon: 'label',
    label: 'Categorias',
    meta: `${categoryStore.datasetOutput.length} de saída · ${categoryStore.datasetInput.length} de entrada`,
    action: () => categoryStore.showCategories(),
  },
  {
    icon: 'credit_card',
    label: 'Cartões de crédito',
    meta: hasCards.value
      ? plural(cardStore.activeCards.length, 'cartão', 'cartões')
      : 'Nenhum cadastrado',
    action: () => cardStore.showCards(),
  },
  {
    icon: 'event_repeat',
    label: 'Operações recorrentes',
    meta: activeRulesCount.value
      ? plural(activeRulesCount.value, 'regra ativa', 'regras ativas')
      : 'Nenhuma regra',
    action: () => void router.push({ name: 'recurrence' }),
  },
])

const openInvoiceText = computed(() =>
  overview.value?.openInvoice
    ? BRL(Math.abs(overview.value.openInvoice.totalInCents) / 100).format()
    : '',
)

// Backup ---------------------------------------------------------------------

const lastBackupDays = computed(() => {
  if (!configStore.lastBackupAt) return null
  return dayjs().startOf('day').diff(dayjs(configStore.lastBackupAt).startOf('day'), 'day')
})

const backupState = computed(() => {
  const days = lastBackupDays.value
  if (days === null) {
    return {
      icon: 'cloud_off',
      tone: 'warn',
      title: 'Nenhum backup ainda',
      meta: 'Seus dados ficam só neste aparelho',
    }
  }
  if (days > 7) {
    return {
      icon: 'schedule',
      tone: 'warn',
      title: `Último backup há ${days} dias`,
      meta: 'Recomendamos exportar toda semana',
    }
  }
  return {
    icon: 'cloud_done',
    tone: 'ok',
    title:
      days === 0
        ? 'Backup feito hoje'
        : days === 1
          ? 'Backup feito ontem'
          : `Último backup há ${days} dias`,
    meta: 'Seus dados estão protegidos',
  }
})

async function doBackup() {
  $q.loading.show({ delay: 700 })
  const ret = await backup()
  $q.loading.hide()
  if (ret.ok) {
    configStore.markBackupDone()
    $q.notify({ type: 'positive', message: 'Backup salvo em Documentos' })
  } else {
    console.error('Erro ao realizar backup:', ret.error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao realizar backup. Tente novamente mais tarde.',
    })
  }
}

function confirmImportBackup() {
  $q.dialog({
    component: ConfirmSheetDialog,
    componentProps: {
      title: 'Importar backup substitui tudo',
      message:
        'Todas as operações, cartões e categorias atuais serão trocados pelos do arquivo. Isso não pode ser desfeito. Exporte um backup antes, se ainda não fez.',
      confirmLabel: 'Escolher arquivo',
      destructive: true,
    },
  }).onOk(() => {
    void doImportBackup()
  })
}

async function doImportBackup() {
  try {
    await actWithDbConnectionStopped(async () => {
      await importBackup()
    })
    $q.notify({ type: 'positive', message: 'Backup restaurado com sucesso!' })
    await operationStore.refreshScreen()
    await notificationService.rescheduleAll()
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <q-page class="more-page">
    <ScreenHeader heading="Mais" hide-scope hide-eye />

    <ScreenBody gap="28px">
      <ErrorBoundary>
        <section
          v-if="hasCards"
          class="ds-card feature-card feature-card--clickable"
          @click="router.push({ name: 'invoices' })"
        >
          <div class="feature-card__icon feature-card__icon--filled">
            <q-icon name="receipt_long" size="24px" />
          </div>
          <div class="feature-card__body">
            <div class="feature-card__title">Faturas</div>
            <div v-if="overview?.openInvoice" class="feature-card__meta">
              {{ overview.openInvoice.cardName }} · aberta
              <ConcealableValue concealed-class="feature-card__strong">
                <strong class="feature-card__strong">{{ openInvoiceText }}</strong>
              </ConcealableValue>
            </div>
            <div v-else class="feature-card__meta">Acompanhe as faturas dos seus cartões</div>
          </div>
          <span v-if="overview && overview.payableCount > 0" class="ds-badge ds-badge--expense">
            {{ overview.payableCount }} a pagar
          </span>
          <q-icon name="chevron_right" size="20px" class="ds-chevron" />
        </section>

        <section v-else class="ds-card feature-card">
          <div class="feature-card__icon">
            <q-icon name="credit_card" size="24px" />
          </div>
          <div class="feature-card__body">
            <div class="feature-card__title">Faturas</div>
            <div class="feature-card__meta">
              Cadastre um cartão para acompanhar as faturas aqui.
            </div>
          </div>
          <button
            type="button"
            class="ds-pill-btn ds-pill-btn--primary feature-card__cta"
            @click="cardStore.addCard()"
          >
            <q-icon name="add" size="17px" />
            Cartão
          </button>
        </section>

        <section class="group">
          <div class="ds-section-label">Cadastros</div>
          <div class="ds-card group__card">
            <div
              v-for="item in registries"
              :key="item.label"
              class="ds-row ds-row--clickable"
              @click="item.action()"
            >
              <div class="ds-avatar">
                <q-icon :name="item.icon" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="ds-row__title">{{ item.label }}</div>
                <div class="ds-row__meta">{{ item.meta }}</div>
              </div>
              <q-icon name="chevron_right" size="20px" class="ds-chevron" />
            </div>
          </div>
        </section>

        <section class="group">
          <div class="ds-section-label">Exibição</div>
          <div class="ds-card group__card">
            <div class="ds-row ds-row--clickable" @click="configStore.toggleValuesVisibility()">
              <div class="ds-avatar ds-avatar--neutral">
                <q-icon name="visibility_off" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="ds-row__title">Ocultar valores</div>
                <div class="ds-row__meta">Toque no olho para revelar</div>
              </div>
              <span
                class="toggle"
                :class="{ 'toggle--on': configStore.hideValues }"
                role="switch"
                :aria-checked="configStore.hideValues"
              >
                <span class="toggle__knob"></span>
              </span>
            </div>
            <div
              class="ds-row ds-row--clickable"
              @click="configStore.toggleOperationDetailsVisibility()"
            >
              <div class="ds-avatar ds-avatar--neutral">
                <q-icon name="unfold_more" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="ds-row__title">Detalhar dias por padrão</div>
                <div class="ds-row__meta">Operações abertas ao entrar no mês</div>
              </div>
              <span
                class="toggle"
                :class="{ 'toggle--on': configStore.showOperationDetails }"
                role="switch"
                :aria-checked="configStore.showOperationDetails"
              >
                <span class="toggle__knob"></span>
              </span>
            </div>
          </div>
        </section>

        <section class="group">
          <div class="ds-section-label">Backup</div>
          <div class="ds-card backup">
            <div class="backup__status">
              <div
                class="ds-avatar"
                :class="backupState.tone === 'warn' ? 'ds-avatar--expense' : 'ds-avatar--income'"
              >
                <q-icon :name="backupState.icon" size="20px" />
              </div>
              <div class="ds-row__body">
                <div class="ds-row__title">{{ backupState.title }}</div>
                <div
                  class="ds-row__meta"
                  :class="{ 'backup__meta--warn': backupState.tone === 'warn' }"
                >
                  {{ backupState.meta }}
                </div>
              </div>
            </div>
            <div class="backup__actions">
              <button
                type="button"
                class="ds-block-btn ds-block-btn--primary ds-block-btn--grow"
                @click="doBackup()"
              >
                <q-icon name="backup" size="18px" />
                Exportar agora
              </button>
              <button
                type="button"
                class="ds-block-btn ds-block-btn--outline"
                @click="confirmImportBackup()"
              >
                <q-icon name="cloud_download" size="18px" />
                Importar
              </button>
            </div>
            <div class="backup__hint">
              O arquivo é salvo na pasta pública de Documentos do aparelho.
            </div>
          </div>
        </section>

        <div class="version">
          MyExpenses<template v-if="appVersion"> · versão {{ appVersion }}</template>
        </div>
      </ErrorBoundary>
    </ScreenBody>
  </q-page>
</template>

<style lang="scss" scoped>
.more-page {
  background: var(--ds-surface);
}

.feature-card {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-card--clickable {
  cursor: pointer;
}

.feature-card__icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--ds-accent-soft);
  color: var(--ds-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feature-card__icon--filled {
  background: var(--ds-header);
  color: #fff;
}

.feature-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feature-card__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ds-ink);
}

.feature-card__meta {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--ds-muted);
}

.feature-card__strong {
  font-weight: 700;
  color: var(--ds-ink);
}

.feature-card__cta {
  padding: 9px 12px;
  font-size: 13px;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group__card {
  overflow: hidden;
}

.toggle {
  width: 44px;
  height: 26px;
  border-radius: 13px;
  padding: 3px;
  display: flex;
  justify-content: flex-start;
  background: #cfd8d3;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle--on {
  justify-content: flex-end;
  background: var(--ds-header);
}

.toggle__knob {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.backup {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.backup__status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backup__meta--warn {
  color: var(--ds-expense);
}

.backup__actions {
  display: flex;
  gap: 8px;
}

.backup__hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ds-faint);
}

.version {
  text-align: center;
  padding-top: 6px;
  font-size: 12px;
  color: var(--ds-hairline);
}
</style>

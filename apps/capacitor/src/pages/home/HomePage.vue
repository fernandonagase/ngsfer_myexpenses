<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import ScreenHeader from 'src/components/shell/ScreenHeader.vue'
import ScreenBody from 'src/components/shell/ScreenBody.vue'
import ConcealableValue from 'src/components/ConcealableValue.vue'
import { useHomeStore } from 'src/stores/home-store'
import { useOperationStore } from 'src/stores/operation-store'
import { useCardStore } from 'src/stores/card-store'

const router = useRouter()
const homeStore = useHomeStore()
const operationStore = useOperationStore()
const cardStore = useCardStore()

const now = dayjs()
const todayLabel = now.format('D [de] MMM').replace('.', '')
const monthLabel = now.format('MMMM')
const daysLeft = now.endOf('month').date() - now.date()

const balance = computed(() => homeStore.summary?.balanceInCents ?? 0)
const inflows = computed(() => homeStore.summary?.scheduledInflowsInCents ?? 0)
const outflows = computed(() => homeStore.summary?.scheduledOutflowsInCents ?? 0)
const projected = computed(() => balance.value + inflows.value + outflows.value)

const scheduledTotal = computed(() => inflows.value + Math.abs(outflows.value))
const inPct = computed(() =>
  scheduledTotal.value ? Math.round((inflows.value / scheduledTotal.value) * 100) : 0,
)
const outPct = computed(() => (scheduledTotal.value ? 100 - inPct.value : 0))

const isEmpty = computed(
  () => operationStore.hasLoadedFirstTime && operationStore.months.length === 0,
)

const fmt = (cents: number) => BRL(cents / 100).format()

function goToOperations() {
  const currentMonth = dayjs().format('YYYY-MM')
  if (operationStore.months.some((month) => month.value === currentMonth)) {
    operationStore.month = currentMonth
  }
  void router.push({ name: 'operations' })
}

const shortcuts = [
  {
    icon: 'event_repeat',
    label: 'Recorrências',
    action: () => void router.push({ name: 'recurrence' }),
  },
  { icon: 'credit_card', label: 'Cartões', action: () => cardStore.showCards() },
  {
    icon: 'pie_chart',
    label: 'Por categoria',
    action: () => void router.push({ name: 'operations-by-category' }),
  },
]
</script>

<template>
  <q-page class="home-page">
    <ScreenHeader>
      <template #hero>
        <div class="screen-header__caption">Saldo hoje · {{ todayLabel }}</div>
        <ConcealableValue concealed-class="screen-header__value">
          <div
            class="screen-header__value"
            :class="{ 'screen-header__value--negative': balance < 0 }"
          >
            {{ homeStore.summary ? fmt(balance) : '—' }}
          </div>
        </ConcealableValue>
      </template>
    </ScreenHeader>

    <ScreenBody>
      <template v-if="homeStore.error">
        <div class="ds-card home-error">
          <q-icon name="error_outline" color="negative" size="32px" />
          <p class="text-body1 text-negative q-mt-sm q-mb-none">{{ homeStore.error }}</p>
        </div>
      </template>

      <template v-else-if="!homeStore.hasLoaded">
        <div class="ds-card home-loading">
          <q-spinner color="primary" size="32px" />
        </div>
      </template>

      <template v-else-if="homeStore.summary">
        <section class="ds-card projection">
          <div class="projection__head">
            <div class="ds-section-label" style="padding: 0">Até o fim de {{ monthLabel }}</div>
            <div class="projection__days">{{ daysLeft }} {{ daysLeft === 1 ? 'dia' : 'dias' }}</div>
          </div>

          <div class="projection__main">
            <div class="projection__caption">Deve sobrar</div>
            <ConcealableValue concealed-class="projection__value">
              <div
                class="projection__value"
                :class="{ 'projection__value--negative': projected < 0 }"
              >
                {{ fmt(projected) }}
              </div>
            </ConcealableValue>
          </div>

          <div class="projection__bar" aria-hidden="true">
            <div class="projection__bar-in" :style="{ width: `${inPct}%` }"></div>
            <div class="projection__bar-out" :style="{ width: `${outPct}%` }"></div>
          </div>

          <div class="projection__tiles">
            <div class="projection__tile" @click="goToOperations">
              <div class="projection__tile-label">
                <span class="projection__dot projection__dot--in"></span>Vai entrar
              </div>
              <ConcealableValue concealed-class="projection__tile-value">
                <div class="projection__tile-value projection__tile-value--in">
                  {{ fmt(inflows) }}
                </div>
              </ConcealableValue>
            </div>
            <div class="projection__tile" @click="goToOperations">
              <div class="projection__tile-label">
                <span class="projection__dot projection__dot--out"></span>Vai sair
              </div>
              <ConcealableValue concealed-class="projection__tile-value">
                <div class="projection__tile-value projection__tile-value--out">
                  {{ fmt(outflows) }}
                </div>
              </ConcealableValue>
            </div>
          </div>

          <div class="projection__link" @click="goToOperations">
            Ver agendamentos
            <q-icon name="chevron_right" size="18px" />
          </div>
        </section>

        <section v-if="isEmpty" class="ds-card onboarding">
          <div class="onboarding__title">Comece por aqui</div>
          <div class="onboarding__text">
            Registre o saldo que você tem hoje e a próxima conta a pagar. O resumo passa a mostrar
            quanto deve sobrar no mês.
          </div>
          <div class="onboarding__actions">
            <button
              type="button"
              class="ds-pill-btn ds-pill-btn--primary"
              @click="operationStore.addOperation()"
            >
              <q-icon name="arrow_downward" size="18px" />
              Registrar saldo
            </button>
            <button
              type="button"
              class="ds-pill-btn ds-pill-btn--outline"
              @click="operationStore.addOperation()"
            >
              <q-icon name="event" size="18px" />
              Agendar conta
            </button>
          </div>
        </section>

        <section v-else class="shortcuts">
          <button
            v-for="shortcut in shortcuts"
            :key="shortcut.label"
            type="button"
            class="ds-card ds-card--flat shortcut"
            @click="shortcut.action()"
          >
            <div class="ds-avatar">
              <q-icon :name="shortcut.icon" size="20px" />
            </div>
            <div class="shortcut__label">{{ shortcut.label }}</div>
          </button>
        </section>
      </template>
    </ScreenBody>
  </q-page>
</template>

<style lang="scss" scoped>
.home-page {
  background: var(--ds-surface);
}

.home-error,
.home-loading {
  padding: 32px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.projection {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.projection__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.projection__days {
  font-size: 12px;
  color: var(--ds-faint);
}

.projection__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.projection__caption {
  font-size: 13px;
  color: var(--ds-muted);
}

.projection__value {
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: var(--ds-ink);
}

.projection__value--negative {
  color: var(--ds-expense);
}

.projection__bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #eef1f0;
  gap: 2px;
}

.projection__bar-in {
  background: var(--ds-income);
  border-radius: 4px;
}

.projection__bar-out {
  background: var(--ds-expense);
  border-radius: 4px;
}

.projection__tiles {
  display: flex;
  gap: 10px;
}

.projection__tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px;
  border-radius: 12px;
  background: #f6f8f7;
  cursor: pointer;
}

.projection__tile-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ds-muted);
}

.projection__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.projection__dot--in {
  background: var(--ds-income);
}

.projection__dot--out {
  background: var(--ds-expense);
}

.projection__tile-value {
  font-size: 17px;
  font-weight: 700;
}

.projection__tile-value--in {
  color: var(--ds-income);
}

.projection__tile-value--out {
  color: var(--ds-expense);
}

.projection__link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 2px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ds-accent);
  cursor: pointer;
}

.onboarding {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.onboarding__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ds-ink);
}

.onboarding__text {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ds-muted);
}

.onboarding__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.shortcut {
  border: none;
  font-family: inherit;
  border-radius: 14px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.shortcut__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ds-ink);
  text-align: center;
}
</style>

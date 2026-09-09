<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BRL } from '@ngsfer-myexpenses/utils'
import dayjs from 'dayjs'
import { useQuasar } from 'quasar'

import type { Category, CreditCard, Center } from 'src/databases/entities/expenses'
import type { CategoryType } from 'src/databases/entities/expenses/types/category.types'
import { useCategoryStore } from 'src/stores/category-store'
import { useCardStore } from 'src/stores/card-store'
import { useCenterStore } from 'src/stores/center-store'
import { type RecurrenceType, recurrenceTypeOptions } from './recurrence-types'
import { recurrenceFrequencyOptions } from './recurrence-frequencies'
import { FrequencyType } from 'src/databases/entities/expenses/recurring-rule'
import { notificationService } from 'src/services/notification-service'
import { NONE_LABEL } from 'src/models/center-scope'
import CategoryPickerDialog from './CategoryPickerDialog.vue'

const $q = useQuasar()

defineProps<{ lockCenter?: boolean }>()

const value = defineModel<string>('value')
const installmentCount = defineModel<number>('installmentCount')
const date = defineModel<string>('date')
const category = defineModel<Category | null>('category')
const description = defineModel<string>('description')
const operationType = defineModel<CategoryType>('operationType', { default: 'Saída' })
const recurrenceType = defineModel<RecurrenceType>('recurrenceType', { default: 'one-time' })
const recurrenceFrequency = defineModel<FrequencyType | undefined>('recurrenceFrequency')
const notes = defineModel<string | undefined>('notes')
const notificationEnabled = defineModel<boolean>('notificationEnabled', { default: false })
const notificationDaysBefore = defineModel<number | undefined>('notificationDaysBefore')
const notificationTime = defineModel<string | undefined>('notificationTime')
const paymentMethod = defineModel<'cash' | 'credit'>('paymentMethod', { default: 'cash' })
const creditCard = defineModel<CreditCard | null>('creditCard', { default: null })
const center = defineModel<Center | null>('center', { default: null })

const moneyFormatForDirective = {
  prefix: '',
  thousands: '.',
  decimal: ',',
  precision: 2,
  focusOnRight: true,
}
const valueRules = [(val: string) => BRL(val).value !== 0 || 'Informe um valor diferente de 0']

const categoryStore = useCategoryStore()
const cardStore = useCardStore()
const centerStore = useCenterStore()

const isDespesa = computed(() => operationType.value === 'Saída')
const accent = computed(() => (isDespesa.value ? '#c10015' : '#21ba45'))

const centerOptions = computed(() => [
  { label: NONE_LABEL, value: null as number | null },
  ...centerStore.activeCenters.map((c) => ({ label: c.name, value: c.id })),
])

const filteredCategories = computed<Array<Category>>(() =>
  operationType.value === 'Entrada' ? categoryStore.datasetInput : categoryStore.datasetOutput,
)

const hasInstallments = computed(() => recurrenceType.value === 'installments')
const isRecurring = computed(() => recurrenceType.value === 'recurring')
const isCredit = computed(() => paymentMethod.value === 'credit')
const canUseCredit = computed(() => operationType.value === 'Saída' && !isRecurring.value)

onMounted(async () => {
  await cardStore.fetchCards()
})

const today = computed(() => dayjs().format('YYYY-MM-DD'))
const yesterday = computed(() => dayjs().subtract(1, 'day').format('YYYY-MM-DD'))

type DateMode = 'hoje' | 'ontem' | 'outra'
const manualDate = ref(
  date.value !== undefined && date.value !== today.value && date.value !== yesterday.value,
)
const dateMode = computed<DateMode>(() => {
  if (manualDate.value) return 'outra'
  if (date.value === today.value) return 'hoje'
  if (date.value === yesterday.value) return 'ontem'
  return 'outra'
})

function selectDateMode(mode: DateMode) {
  if (mode === 'hoje') {
    manualDate.value = false
    date.value = today.value
  } else if (mode === 'ontem') {
    manualDate.value = false
    date.value = yesterday.value
  } else {
    manualDate.value = true
  }
}

const isFutureDate = computed(() => {
  if (!date.value) return false
  return dayjs(date.value).isAfter(dayjs(), 'day')
})

const installmentAmount = computed(() => {
  const count = installmentCount.value ?? 1
  if (!count) return ''
  return BRL(BRL(value.value ?? 0).value / count).format()
})

const notificationDaysBeforeOptions = [
  { label: 'No mesmo dia', value: 0 },
  { label: '1 dia antes', value: 1 },
  { label: '2 dias antes', value: 2 },
]

const extrasOpen = defineModel<boolean>('extrasOpen', { default: false })
const extrasLabel = computed(() =>
  extrasOpen.value ? 'Ocultar detalhes' : 'Observações e centro financeiro',
)

watch(
  [operationType, filteredCategories],
  () => {
    if (category.value?.type !== operationType.value) {
      category.value = filteredCategories.value[0] ?? null
    }
  },
  {
    immediate: true,
  },
)

watch(recurrenceType, () => {
  if (recurrenceType.value === 'recurring' && !recurrenceFrequency.value) {
    recurrenceFrequency.value = FrequencyType.MONTHLY
  }
})

watch([operationType, recurrenceType], () => {
  if (!canUseCredit.value) {
    paymentMethod.value = 'cash'
    creditCard.value = null
  }
})

watch(paymentMethod, (method) => {
  if (method !== 'credit') {
    creditCard.value = null
    return
  }
  if (cardStore.activeCards.length === 0) {
    $q.notify({
      type: 'warning',
      message: 'Cadastre um cartão em Configurações antes de lançar no crédito.',
    })
    paymentMethod.value = 'cash'
    return
  }
  if (!creditCard.value && cardStore.activeCards.length === 1) {
    creditCard.value = cardStore.activeCards[0] ?? null
  }
})

watch(isFutureDate, (isFuture) => {
  if (!isFuture) {
    notificationEnabled.value = false
    notificationDaysBefore.value = undefined
    notificationTime.value = undefined
  }
})

async function onNotificationToggle(val: boolean) {
  if (!val) return

  const granted = await notificationService.checkAndRequestPermissions()
  if (!granted) {
    notificationEnabled.value = false
    $q.notify({
      type: 'warning',
      message: 'Permissão de notificações negada. Ative nas configurações do dispositivo.',
    })
  }
}

function openCategoryPicker() {
  $q.dialog({
    component: CategoryPickerDialog,
    componentProps: {
      categories: filteredCategories.value,
      selected: category.value,
      accent: accent.value,
    },
  }).onOk((selected: Category) => {
    category.value = selected
  })
}

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <div class="op-form">
    <div class="op-segment op-segment--type">
      <div
        class="op-segment__item"
        :class="{ 'op-segment__item--active': isDespesa }"
        :style="isDespesa ? { color: accent } : undefined"
        @click="operationType = 'Saída'"
      >
        <q-icon name="arrow_upward" size="18px" />
        Despesa
      </div>
      <div
        class="op-segment__item"
        :class="{ 'op-segment__item--active': !isDespesa }"
        :style="!isDespesa ? { color: accent } : undefined"
        @click="operationType = 'Entrada'"
      >
        <q-icon name="arrow_downward" size="18px" />
        Receita
      </div>
    </div>

    <div class="op-hero" :style="{ background: `${accent}0F` }">
      <div class="op-hero__label" :style="{ color: accent }">
        Valor da {{ isDespesa ? 'despesa' : 'receita' }}
      </div>
      <div class="op-hero__amount" :style="{ color: accent }">
        <span class="op-hero__sign">{{ isDespesa ? '−' : '+' }}R$</span>
        <q-field
          v-model="value"
          borderless
          dense
          :rules="valueRules"
          lazy-rules
          class="op-hero__field"
        >
          <template v-slot:control="{ id, modelValue, emitValue }">
            <input
              :id="id"
              class="op-hero__input"
              :style="{ color: accent }"
              :value="modelValue"
              inputmode="decimal"
              @change="(e) => emitValue((e.target as HTMLInputElement)!.value)"
              v-money3="moneyFormatForDirective"
            />
          </template>
        </q-field>
      </div>
    </div>

    <div class="op-field-group">
      <div class="op-field-label">Descrição</div>
      <q-input
        v-model="description"
        type="text"
        maxlength="50"
        counter
        outlined
        dense
        placeholder="Ex: Mercado da esquina"
        class="op-description"
      >
        <template v-slot:prepend>
          <q-icon name="edit" size="20px" :style="{ color: accent }" />
        </template>
      </q-input>
    </div>

    <div class="op-field-group">
      <div class="op-field-label">Categoria</div>
      <div class="op-category" @click="openCategoryPicker">
        <div
          class="op-category__avatar"
          :style="{
            background: `${accent}1F`,
            color: accent,
          }"
        >
          {{ category ? initial(category.name) : '?' }}
        </div>
        <div class="op-category__text">
          <div class="op-category__name">{{ category?.name ?? 'Selecionar categoria' }}</div>
          <div class="op-category__hint">
            Tocar para buscar entre {{ filteredCategories.length }} categorias
          </div>
        </div>
        <q-icon name="search" size="20px" color="grey-7" />
      </div>
      <div v-if="!category" class="op-field-error">Informe a categoria da operação</div>
    </div>

    <div class="op-row">
      <div class="op-field-group op-row__main">
        <div class="op-field-label">Data</div>
        <div class="op-segment op-segment--compact">
          <div
            class="op-segment__item"
            :class="{ 'op-segment__item--active': dateMode === 'hoje' }"
            @click="selectDateMode('hoje')"
          >
            Hoje
          </div>
          <div
            class="op-segment__item"
            :class="{ 'op-segment__item--active': dateMode === 'ontem' }"
            @click="selectDateMode('ontem')"
          >
            Ontem
          </div>
          <div
            class="op-segment__item"
            :class="{ 'op-segment__item--active': dateMode === 'outra' }"
            @click="selectDateMode('outra')"
          >
            Outra
          </div>
        </div>
      </div>
      <div v-if="canUseCredit" class="op-field-group op-row__side">
        <div class="op-field-label">Pagamento</div>
        <div class="op-segment op-segment--compact">
          <div
            class="op-segment__item op-segment__item--icon"
            :class="{ 'op-segment__item--active': !isCredit }"
            @click="paymentMethod = 'cash'"
          >
            <q-icon name="payments" size="19px" />
          </div>
          <div
            class="op-segment__item op-segment__item--icon"
            :class="{ 'op-segment__item--active': isCredit }"
            @click="paymentMethod = 'credit'"
          >
            <q-icon name="credit_card" size="19px" />
          </div>
        </div>
      </div>
    </div>

    <q-input v-model="date" type="date" outlined dense v-if="dateMode === 'outra'" />

    <div v-if="isCredit && canUseCredit" class="op-field-group">
      <div class="op-field-label">Cartão</div>
      <div class="op-scroll-row">
        <div
          v-for="card in cardStore.activeCards"
          :key="card.id"
          class="op-pill"
          :class="{ 'op-pill--active': card.id === creditCard?.id }"
          :style="
            card.id === creditCard?.id
              ? {
                  borderColor: accent,
                  background: `${accent}14`,
                  color: accent,
                }
              : undefined
          "
          @click="creditCard = card"
        >
          <q-icon name="credit_card" size="17px" />
          {{ card.name }}
        </div>
      </div>
      <div v-if="cardStore.activeCards.length === 0" class="op-field-error">
        Cadastre um cartão em Configurações antes de lançar no crédito.
      </div>
    </div>

    <div class="op-field-group">
      <div class="op-field-label-row">
        <div class="op-field-label">Como se repete</div>
      </div>
      <div class="op-scroll-row op-scroll-row--spread">
        <div
          v-for="option in recurrenceTypeOptions"
          :key="option.value"
          class="op-pill op-pill--flex"
          :class="{ 'op-pill--active': recurrenceType === option.value }"
          :style="
            recurrenceType === option.value
              ? {
                  borderColor: accent,
                  background: `${accent}14`,
                  color: accent,
                }
              : undefined
          "
          @click="recurrenceType = option.value"
        >
          {{ option.label }}
        </div>
      </div>

      <template v-if="hasInstallments">
        <div class="op-stepper">
          <div class="op-stepper__label">Parcelas</div>
          <div class="op-stepper__control">
            <div
              class="op-stepper__btn"
              @click="installmentCount = Math.max(2, (installmentCount ?? 2) - 1)"
            >
              <q-icon name="remove" size="18px" :style="{ color: accent }" />
            </div>
            <div class="op-stepper__value">{{ installmentCount }}x</div>
            <div
              class="op-stepper__btn"
              @click="installmentCount = Math.min(24, (installmentCount ?? 1) + 1)"
            >
              <q-icon name="add" size="18px" :style="{ color: accent }" />
            </div>
          </div>
        </div>
        <div class="op-hint">{{ installmentAmount }} por parcela</div>
      </template>

      <template v-if="isRecurring">
        <div class="op-scroll-row">
          <div
            v-for="option in recurrenceFrequencyOptions"
            :key="option.value"
            class="op-pill op-pill--flex"
            :class="{ 'op-pill--active': recurrenceFrequency === option.value }"
            :style="
              recurrenceFrequency === option.value
                ? {
                    borderColor: accent,
                    background: `${accent}14`,
                    color: accent,
                  }
                : undefined
            "
            @click="recurrenceFrequency = option.value"
          >
            {{ option.label }}
          </div>
        </div>
      </template>
    </div>

    <div class="op-extras-toggle" :style="{ color: accent }" @click="extrasOpen = !extrasOpen">
      <q-icon :name="extrasOpen ? 'expand_less' : 'add'" size="19px" />
      {{ extrasLabel }}
    </div>

    <template v-if="extrasOpen">
      <q-input v-model="notes" type="text" label="Observações" outlined dense autogrow />

      <q-select
        v-if="centerStore.hasActiveCenters && !lockCenter"
        :model-value="center?.id ?? null"
        @update:model-value="(id) => (center = centerStore.activeCenters.find((c) => c.id === id) ?? null)"
        :options="centerOptions"
        label="Centro financeiro"
        emit-value
        map-options
        outlined
        dense
      />

      <template v-if="isFutureDate && !isRecurring">
        <q-toggle
          v-model="notificationEnabled"
          label="Notificar"
          color="primary"
          @update:model-value="onNotificationToggle"
        />
        <template v-if="notificationEnabled">
          <q-select
            v-model="notificationDaysBefore"
            :options="notificationDaysBeforeOptions"
            label="Antecedência"
            emit-value
            map-options
            outlined
            dense
          />
          <q-input v-model="notificationTime" type="time" label="Horário" outlined dense />
        </template>
      </template>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.op-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.op-segment {
  display: flex;
  background: rgba(0, 0, 0, 0.045);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.op-segment--compact {
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
}

.op-segment__item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  cursor: pointer;
  user-select: none;
}

.op-segment--compact .op-segment__item {
  padding: 8px 0;
  border-radius: 8px;
  font-size: 13px;
}

.op-segment__item--icon {
  color: rgba(0, 0, 0, 0.6);
}

.op-segment__item--active {
  background: #fff;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
  color: rgba(0, 0, 0, 0.87);
}

.op-hero {
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.op-hero__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.op-hero__amount {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.op-hero__sign {
  font-size: 22px;
  font-weight: 500;
}

.op-hero__field {
  flex: 1;
}

.op-hero__input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 40px;
  font-weight: 700;
  letter-spacing: -0.02em;
  padding: 0;
}

.op-field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.op-field-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.55);
}

.op-field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.op-field-error {
  font-size: 11px;
  color: var(--q-negative);
  padding-left: 2px;
}

.op-category {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  background: #fff;
}

.op-category__avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.op-category__text {
  flex: 1;
  min-width: 0;
}

.op-category__name {
  font-size: 15px;
  font-weight: 500;
}

.op-category__hint {
  font-size: 11.5px;
  color: rgba(0, 0, 0, 0.45);
}

.op-row {
  display: flex;
  gap: 12px;
}

.op-row__main {
  flex: 1;
}

.op-row__side {
  width: 96px;
}

.op-scroll-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.op-scroll-row--spread > .op-pill--flex {
  flex: 1;
}

.op-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border-radius: 999px;
  white-space: nowrap;
  cursor: pointer;
  font-size: 13.5px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  color: rgba(0, 0, 0, 0.65);
  user-select: none;
}

.op-pill--flex {
  justify-content: center;
  text-align: center;
}

.op-pill--active {
  font-weight: 700;
}

.op-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  padding: 12px 14px;
}

.op-stepper__label {
  font-size: 14px;
}

.op-stepper__control {
  display: flex;
  align-items: center;
  gap: 14px;
}

.op-stepper__btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.op-stepper__value {
  font-size: 16px;
  font-weight: 700;
  min-width: 40px;
  text-align: center;
}

.op-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.op-extras-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
  user-select: none;
}

:global(body.body--dark) .op-segment {
  background: rgba(255, 255, 255, 0.08);
}

:global(body.body--dark) .op-segment__item--active {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

:global(body.body--dark) .op-category,
:global(body.body--dark) .op-stepper__btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
}

:global(body.body--dark) .op-pill {
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.75);
}

:global(body.body--dark) .op-stepper {
  background: rgba(255, 255, 255, 0.05);
}
</style>

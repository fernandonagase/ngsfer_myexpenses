<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'

import type { CardInvoice, Operation } from 'src/databases/entities/expenses'
import { InvoiceStatus } from 'src/databases/entities/expenses/card-invoice'
import { useInvoiceStore, type InvoiceCenterShare } from 'src/stores/invoice-store'
import { useOperationStore } from 'src/stores/operation-store'
import InvoicePaymentDialog from 'src/components/card/InvoicePaymentDialog.vue'
import OperationDetailsDialog, {
  type OperationDetailsAction,
} from 'src/components/operation/OperationDetailsDialog.vue'

const props = defineProps<{
  invoice: CardInvoice
}>()

const $q = useQuasar()
const invoiceStore = useInvoiceStore()
const operationStore = useOperationStore()

const total = ref(0)
const breakdown = ref<InvoiceCenterShare[]>([])
const operations = ref<Operation[]>([])
const loading = ref(true)

const monthLabel = computed(() => {
  const label = dayjs(`${props.invoice.referenceMonth}-01`).format('MMMM [de] YYYY')
  return label.charAt(0).toUpperCase() + label.slice(1)
})

const totalString = computed(() => BRL(Math.abs(total.value) / 100).format())

const statusMeta = computed(() => {
  switch (props.invoice.status) {
    case InvoiceStatus.PAGA:
      return { label: 'Paga', color: 'positive' }
    case InvoiceStatus.FECHADA:
      return { label: 'Fechada', color: 'warning' }
    default:
      return { label: 'Aberta', color: 'primary' }
  }
})

const dueDateString = computed(() => dayjs(props.invoice.dueDate).format('DD/MM/YYYY'))

async function load() {
  loading.value = true
  try {
    ;[total.value, breakdown.value, operations.value] = await Promise.all([
      invoiceStore.getInvoiceTotal(props.invoice.id),
      invoiceStore.getInvoiceBreakdownByCenter(props.invoice.id),
      invoiceStore.getInvoiceOperations(props.invoice.id),
    ])
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

function openPurchaseDetails(operation: Operation) {
  $q.dialog({
    component: OperationDetailsDialog,
    componentProps: { operation },
  }).onOk((action: OperationDetailsAction) => {
    if (action === 'edit') {
      operationStore.editOperation(operation)
    } else if (action === 'delete') {
      operationStore.removeOperation(operation)
    }
  })
}

function onPay() {
  if (breakdown.value.length === 0) {
    $q.notify({ type: 'warning', message: 'Esta fatura não possui compras para pagar.' })
    return
  }
  $q.dialog({
    component: InvoicePaymentDialog,
    componentProps: {
      invoice: props.invoice,
      shares: breakdown.value,
    },
  }).onOk((payload: { paymentDate: string; shares: InvoiceCenterShare[] }) => {
    void invoiceStore
      .payInvoice(props.invoice, payload)
      .then((ok) => {
        if (ok) void load()
      })
  })
}

function onReopenPayment() {
  invoiceStore.reopenInvoicePayment(props.invoice)
}

function onReopenForEditing() {
  invoiceStore.reopenInvoiceForEditing(props.invoice)
}

function onCloseEarly() {
  invoiceStore.closeInvoiceEarly(props.invoice)
}
</script>

<template>
  <q-expansion-item class="invoice-card q-mb-sm" bordered>
    <template #header>
      <q-item-section>
        <q-item-label class="text-weight-medium">{{ monthLabel }}</q-item-label>
        <q-item-label caption>Vence em {{ dueDateString }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <div class="column items-end">
          <span class="text-weight-medium">{{ totalString }}</span>
          <q-badge :color="statusMeta.color" :label="statusMeta.label" class="q-mt-xs" />
        </div>
      </q-item-section>
    </template>

    <q-card>
      <q-card-section>
        <div v-if="loading" class="text-grey-7">Carregando...</div>
        <template v-else>
          <div class="text-subtitle2 q-mb-xs">Participação por centro</div>
          <q-list dense>
            <q-item v-for="share in breakdown" :key="share.centerId" class="q-px-none">
              <q-item-section>{{ share.centerName }}</q-item-section>
              <q-item-section side>
                {{ BRL(Math.abs(share.valueInCents) / 100).format() }}
              </q-item-section>
            </q-item>
            <q-item v-if="breakdown.length === 0" class="q-px-none">
              <q-item-section class="text-grey-7">Nenhuma compra nesta fatura.</q-item-section>
            </q-item>
          </q-list>

          <template v-if="operations.length > 0">
            <q-separator spaced />
            <div class="text-subtitle2 q-mb-xs">Compras</div>
            <q-list dense>
              <q-item
                v-for="operation in operations"
                :key="operation.id"
                clickable
                v-ripple
                class="q-px-none"
                @click="openPurchaseDetails(operation)"
              >
                <q-item-section>
                  <q-item-label>{{ operation.description || 'Não identificada' }}</q-item-label>
                  <q-item-label caption>
                    {{ operation.dateString }} · {{ operation.category.name }} ·
                    {{ operation.center.name }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  {{ BRL(Math.abs(operation.valueInCents) / 100).format() }}
                </q-item-section>
              </q-item>
            </q-list>
          </template>

          <div class="row justify-end q-gutter-sm q-mt-md">
            <template v-if="invoice.status === InvoiceStatus.FECHADA">
              <q-btn flat no-caps color="grey-8" label="Reabrir p/ editar" @click="onReopenForEditing" />
              <q-btn
                v-if="total !== 0"
                unelevated
                no-caps
                color="primary"
                label="Pagar"
                @click="onPay"
              />
              <span v-else class="text-caption text-grey-7 self-center">
                Fatura fechada sem compras.
              </span>
            </template>
            <template v-else-if="invoice.status === InvoiceStatus.PAGA">
              <q-btn flat no-caps color="negative" label="Estornar pagamento" @click="onReopenPayment" />
            </template>
            <template v-else>
              <span class="text-caption text-grey-7 self-center">
                Fatura em aberto — acumulando compras.
              </span>
              <q-btn flat no-caps color="grey-8" label="Fechar agora" @click="onCloseEarly" />
            </template>
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<style lang="scss" scoped>
.invoice-card {
  border-radius: 8px;
}
</style>

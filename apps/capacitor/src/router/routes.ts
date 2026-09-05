import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/AppLayout.vue'),
    children: [
      {
        name: 'home',
        path: '',
        component: () => import('pages/home/HomePage.vue'),
        meta: { kind: 'tab', toolbar: 'center', tab: 'home' },
      },
      {
        name: 'operations',
        path: 'operations',
        component: () => import('pages/operations/OperationsPage.vue'),
        meta: { kind: 'tab', toolbar: 'center', tab: 'operations', title: 'Lançamentos' },
      },
      {
        name: 'invoices',
        path: 'invoices',
        component: () => import('src/pages/invoices/InvoicesPage.vue'),
        meta: { kind: 'tab', toolbar: 'title', tab: 'invoices', title: 'Faturas' },
      },
      {
        name: 'operations-by-category',
        path: 'reports/operations-by-category',
        component: () => import('pages/reports/OperationsByCategoryPage.vue'),
        meta: {
          kind: 'tab',
          toolbar: 'title',
          tab: 'reports',
          title: 'Operações por categoria',
          centerLabel: true,
        },
      },
      {
        name: 'settings',
        path: 'settings',
        component: () => import('src/pages/settings/SettingsPage.vue'),
        meta: { kind: 'detail', title: 'Configurações', parent: 'home' },
      },
      {
        name: 'recurrence',
        path: 'recurrence',
        component: () => import('src/pages/RecurrencePage.vue'),
        meta: { kind: 'detail', title: 'Operações recorrentes', parent: 'settings' },
      },

      // Always leave this as last one,
      // but you can also remove it
      {
        name: 'not-found',
        path: ':catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
        meta: { kind: 'detail', title: 'Página não encontrada', parent: 'home' },
      },
    ],
  },
]

export default routes

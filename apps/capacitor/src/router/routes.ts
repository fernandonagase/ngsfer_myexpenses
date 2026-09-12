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
        meta: { kind: 'tab', tab: 'home', ownHeader: true },
      },
      {
        name: 'operations',
        path: 'operations',
        component: () => import('pages/operations/OperationsPage.vue'),
        meta: { kind: 'tab', tab: 'operations', title: 'Operações', ownHeader: true },
      },
      {
        name: 'operations-by-category',
        path: 'reports/operations-by-category',
        component: () => import('pages/reports/OperationsByCategoryPage.vue'),
        meta: { kind: 'tab', tab: 'reports', title: 'Relatórios', ownHeader: true },
      },
      {
        name: 'settings',
        path: 'settings',
        component: () => import('src/pages/settings/SettingsPage.vue'),
        meta: { kind: 'tab', tab: 'more', title: 'Mais', ownHeader: true },
      },
      {
        name: 'invoices',
        path: 'invoices',
        component: () => import('src/pages/invoices/InvoicesPage.vue'),
        meta: { kind: 'detail', title: 'Faturas', parent: 'settings', ownHeader: true },
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

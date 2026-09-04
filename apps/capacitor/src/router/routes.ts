import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/CenterLayout.vue'),
    children: [
      {
        name: 'home',
        path: '',
        component: () => import('pages/home/HomePage.vue'),
      },
      {
        name: 'operations',
        path: 'operations',
        component: () => import('pages/operations/OperationsPage.vue'),
      },
    ],
  },
  {
    path: '/reports',
    component: () => import('src/layouts/ReportsLayout.vue'),
    meta: { title: 'Relatórios' },
    props: (route) => ({
      title: route.meta.title,
    }),
    children: [
      {
        name: 'operations-by-category',
        path: 'operations-by-category',
        component: () => import('pages/reports/OperationsByCategoryPage.vue'),
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('src/layouts/DefaultLayout.vue'),
    meta: { title: 'Configurações' },
    props: (route) => ({
      title: route.meta.title,
    }),
    children: [
      {
        name: 'settings',
        path: '',
        component: () => import('src/pages/settings/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/recurrence',
    component: () => import('src/layouts/DefaultLayout.vue'),
    meta: { title: 'Operações recorrentes' },
    props: (route) => ({
      title: route.meta.title,
    }),
    children: [
      {
        name: 'recurrence',
        path: '',
        component: () => import('src/pages/RecurrencePage.vue'),
      },
    ],
  },
  {
    path: '/invoices',
    component: () => import('src/layouts/InvoicesLayout.vue'),
    meta: { title: 'Faturas' },
    children: [
      {
        name: 'invoices',
        path: '',
        component: () => import('src/pages/invoices/InvoicesPage.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes

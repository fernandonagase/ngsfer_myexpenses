import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/CenterLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/operations/OperationsPage.vue'),
        alias: 'operations',
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('src/layouts/SettingsLayout.vue'),
    children: [
      {
        name: 'settings',
        path: '',
        component: () => import('src/pages/settings/SettingsPage.vue'),
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

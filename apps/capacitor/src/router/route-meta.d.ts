import type { NavigationMeta } from './chrome'

export type RouteName =
  | 'home'
  | 'operations'
  | 'invoices'
  | 'operations-by-category'
  | 'settings'
  | 'recurrence'
  | 'not-found'

declare module 'vue-router' {
  interface RouteMeta extends Omit<NavigationMeta, 'parent'> {
    parent?: RouteName
  }
}

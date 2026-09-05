export type RouteKind = 'tab' | 'detail'
export type ToolbarKind = 'center' | 'title'
export type FooterTab = 'home' | 'operations' | 'invoices' | 'reports'

export interface NavigationMeta {
  kind?: RouteKind // ausente → 'detail' (SHELL-01 / AC7)
  title?: string
  toolbar?: ToolbarKind // só relevante em 'tab'; ausente → 'title'
  tab?: FooterTab // obrigatório em 'tab'
  parent?: string // nome de rota; ausente → 'home' (BACK-02 / AC4)
  centerLabel?: boolean // Relatório: título + nome do centro (SHELL-04)
}

export interface Chrome {
  kind: RouteKind
  showFooter: boolean // kind === 'tab'
  showFab: boolean // kind === 'tab'
  showBack: boolean // kind === 'detail'
  showSettings: boolean // kind === 'tab'
  toolbar: ToolbarKind // 'center' só quando tab && meta.toolbar === 'center'
  title: string // meta.title ?? ''
  activeTab: FooterTab | null
  parent: string // meta.parent ?? 'home'
  showCenterLabel: boolean
}

export function resolveChrome(meta: NavigationMeta): Chrome {
  const kind: RouteKind = meta.kind ?? 'detail'
  const isTab = kind === 'tab'

  return {
    kind,
    showFooter: isTab,
    showFab: isTab,
    showBack: !isTab,
    showSettings: isTab,
    toolbar: isTab && meta.toolbar === 'center' ? 'center' : 'title',
    title: meta.title ?? '',
    activeTab: isTab ? (meta.tab ?? null) : null,
    parent: meta.parent ?? 'home',
    showCenterLabel: meta.centerLabel === true,
  }
}

export type BackTarget = { type: 'back' } | { type: 'replace'; name: string }

export function resolveBackTarget(meta: NavigationMeta, hasAppHistory: boolean): BackTarget {
  if (hasAppHistory) {
    return { type: 'back' }
  }
  return { type: 'replace', name: meta.parent ?? 'home' }
}

export type HardwareBackAction = { type: 'ignore' } | { type: 'exit' } | BackTarget

export function resolveHardwareBack(
  meta: NavigationMeta,
  signals: { hasAppHistory: boolean; overlayOpen: boolean; routeName: string | null },
): HardwareBackAction {
  if (signals.overlayOpen) {
    return { type: 'ignore' }
  }
  if (signals.hasAppHistory) {
    return { type: 'ignore' }
  }
  const kind: RouteKind = meta.kind ?? 'detail'
  if (kind === 'detail') {
    return { type: 'replace', name: meta.parent ?? 'home' }
  }
  if (signals.routeName !== 'home') {
    return { type: 'replace', name: 'home' }
  }
  return { type: 'exit' }
}

export const FOOTER_TABS: ReadonlyArray<{
  tab: FooterTab
  route: string
  label: string
  icon: string
}> = [
  { tab: 'home', route: 'home', label: 'Início', icon: 'home' },
  { tab: 'operations', route: 'operations', label: 'Lançamentos', icon: 'list_alt' },
  { tab: 'invoices', route: 'invoices', label: 'Faturas', icon: 'receipt_long' },
  { tab: 'reports', route: 'operations-by-category', label: 'Relatório', icon: 'trending_up' },
]

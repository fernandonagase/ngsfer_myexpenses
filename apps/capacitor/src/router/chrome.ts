export type RouteKind = 'tab' | 'detail'
export type FooterTab = 'home' | 'operations' | 'reports' | 'more'

export interface NavigationMeta {
  kind?: RouteKind // ausente → 'detail' (SHELL-01 / AC7)
  title?: string
  tab?: FooterTab // obrigatório em 'tab'
  parent?: string // nome de rota; ausente → 'home' (BACK-02 / AC4)
  ownHeader?: boolean // a página desenha o próprio cabeçalho verde (ScreenHeader)
}

export interface Chrome {
  kind: RouteKind
  showFooter: boolean // kind === 'tab'
  showFab: boolean // kind === 'tab'
  showBack: boolean // kind === 'detail'
  showHeader: boolean // layout desenha a toolbar padrão (só quando a página não tem a sua)
  title: string // meta.title ?? ''
  activeTab: FooterTab | null
  parent: string // meta.parent ?? 'home'
}

export function resolveChrome(meta: NavigationMeta): Chrome {
  const kind: RouteKind = meta.kind ?? 'detail'
  const isTab = kind === 'tab'

  return {
    kind,
    showFooter: isTab,
    showFab: isTab,
    showBack: !isTab,
    showHeader: meta.ownHeader !== true,
    title: meta.title ?? '',
    activeTab: isTab ? (meta.tab ?? null) : null,
    parent: meta.parent ?? 'home',
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

/**
 * Barra inferior: quatro abas + botão de adicionar no centro.
 * Faturas sai da barra e vira tela empilhada acessada por "Mais".
 */
export const FOOTER_TABS: ReadonlyArray<{
  tab: FooterTab
  route: string
  label: string
  icon: string
}> = [
  { tab: 'home', route: 'home', label: 'Início', icon: 'home' },
  { tab: 'operations', route: 'operations', label: 'Operações', icon: 'list_alt' },
  { tab: 'reports', route: 'operations-by-category', label: 'Relatórios', icon: 'trending_up' },
  { tab: 'more', route: 'settings', label: 'Mais', icon: 'more_horiz' },
]

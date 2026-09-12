import { describe, expect, it } from 'vitest'

import { FOOTER_TABS, resolveBackTarget, resolveChrome, resolveHardwareBack } from './chrome'

describe('resolveChrome', () => {
  it('home: tab com cabeçalho próprio + activeTab home', () => {
    expect(resolveChrome({ kind: 'tab', tab: 'home', ownHeader: true })).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showHeader: false,
      title: '',
      activeTab: 'home',
      parent: 'home',
    })
  })

  it('operations: tab com cabeçalho próprio + activeTab operations + título Operações', () => {
    expect(
      resolveChrome({ kind: 'tab', tab: 'operations', title: 'Operações', ownHeader: true }),
    ).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showHeader: false,
      title: 'Operações',
      activeTab: 'operations',
      parent: 'home',
    })
  })

  it('operations-by-category: tab reports com cabeçalho próprio', () => {
    expect(
      resolveChrome({
        kind: 'tab',
        tab: 'reports',
        title: 'Relatórios',
        ownHeader: true,
      }),
    ).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showHeader: false,
      title: 'Relatórios',
      activeTab: 'reports',
      parent: 'home',
    })
  })

  it('settings: vira a aba "Mais", com rodapé e fab', () => {
    expect(resolveChrome({ kind: 'tab', tab: 'more', title: 'Mais', ownHeader: true })).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showHeader: false,
      title: 'Mais',
      activeTab: 'more',
      parent: 'home',
    })
  })

  it('invoices: tela empilhada (detail) com cabeçalho próprio e parent settings', () => {
    expect(
      resolveChrome({ kind: 'detail', title: 'Faturas', parent: 'settings', ownHeader: true }),
    ).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showHeader: false,
      title: 'Faturas',
      activeTab: null,
      parent: 'settings',
    })
  })

  it('recurrence: detail com cabeçalho próprio + parent settings', () => {
    expect(
      resolveChrome({
        kind: 'detail',
        title: 'Operações recorrentes',
        parent: 'settings',
        ownHeader: true,
      }),
    ).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showHeader: false,
      title: 'Operações recorrentes',
      activeTab: null,
      parent: 'settings',
    })
  })

  it('cadastros (categorias/cartões/centros): detail com cabeçalho próprio + parent settings', () => {
    for (const title of ['Categorias', 'Cartões de crédito', 'Centros financeiros']) {
      expect(resolveChrome({ kind: 'detail', title, parent: 'settings', ownHeader: true })).toEqual(
        {
          kind: 'detail',
          showFooter: false,
          showFab: false,
          showBack: true,
          showHeader: false,
          title,
          activeTab: null,
          parent: 'settings',
        },
      )
    }
  })

  it('not-found: detail + parent home', () => {
    expect(
      resolveChrome({ kind: 'detail', title: 'Página não encontrada', parent: 'home' }),
    ).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showHeader: true,
      title: 'Página não encontrada',
      activeTab: null,
      parent: 'home',
    })
  })

  it('meta vazio (sem kind) → detail com parent home (SHELL-01 AC7 / BACK-02 AC4)', () => {
    const chrome = resolveChrome({})
    expect(chrome.kind).toBe('detail')
    expect(chrome.showBack).toBe(true)
    expect(chrome.showFooter).toBe(false)
    expect(chrome.showFab).toBe(false)
    expect(chrome.showHeader).toBe(true)
    expect(chrome.activeTab).toBeNull()
    expect(chrome.parent).toBe('home')
  })

  it('ownHeader ausente → layout desenha a toolbar padrão', () => {
    expect(resolveChrome({ kind: 'tab', tab: 'home' }).showHeader).toBe(true)
  })
})

describe('resolveBackTarget', () => {
  it('com histórico do app → back, independentemente de meta (P2 AC1)', () => {
    expect(resolveBackTarget({ kind: 'detail', parent: 'settings' }, true)).toEqual({
      type: 'back',
    })
  })

  it('sem histórico com meta.parent="settings" → replace settings (P2 AC3)', () => {
    expect(resolveBackTarget({ kind: 'detail', parent: 'settings' }, false)).toEqual({
      type: 'replace',
      name: 'settings',
    })
  })

  it('sem histórico sem meta.parent → replace home (P2 AC4)', () => {
    expect(resolveBackTarget({ kind: 'detail' }, false)).toEqual({
      type: 'replace',
      name: 'home',
    })
  })

  it('sem histórico com meta vazio (rota sem kind) → replace home', () => {
    expect(resolveBackTarget({}, false)).toEqual({ type: 'replace', name: 'home' })
  })
})

describe('resolveHardwareBack', () => {
  it('overlayOpen true → ignore, mesmo sem histórico e em home (precedência sobre exit)', () => {
    expect(
      resolveHardwareBack(
        { kind: 'tab', tab: 'home' },
        { hasAppHistory: false, overlayOpen: true, routeName: 'home' },
      ),
    ).toEqual({ type: 'ignore' })
  })

  it('overlayOpen false, hasAppHistory true → ignore (Quasar faz window.history.back())', () => {
    expect(
      resolveHardwareBack(
        { kind: 'detail', parent: 'settings' },
        { hasAppHistory: true, overlayOpen: false, routeName: 'recurrence' },
      ),
    ).toEqual({ type: 'ignore' })
  })

  it('detail sem overlay e sem histórico → replace para meta.parent', () => {
    expect(
      resolveHardwareBack(
        { kind: 'detail', parent: 'settings' },
        { hasAppHistory: false, overlayOpen: false, routeName: 'invoices' },
      ),
    ).toEqual({ type: 'replace', name: 'settings' })
  })

  it('detail sem parent, sem overlay e sem histórico → replace home', () => {
    expect(
      resolveHardwareBack(
        { kind: 'detail' },
        { hasAppHistory: false, overlayOpen: false, routeName: 'not-found' },
      ),
    ).toEqual({ type: 'replace', name: 'home' })
  })

  it('tab diferente de home sem overlay e sem histórico → replace home', () => {
    expect(
      resolveHardwareBack(
        { kind: 'tab', tab: 'more' },
        { hasAppHistory: false, overlayOpen: false, routeName: 'settings' },
      ),
    ).toEqual({ type: 'replace', name: 'home' })
  })

  it('routeName home sem overlay e sem histórico → exit', () => {
    expect(
      resolveHardwareBack(
        { kind: 'tab', tab: 'home' },
        { hasAppHistory: false, overlayOpen: false, routeName: 'home' },
      ),
    ).toEqual({ type: 'exit' })
  })
})

describe('FOOTER_TABS', () => {
  it('contém exatamente 4 destinos, nesta ordem: home, operations, reports, more', () => {
    expect(FOOTER_TABS.map((item) => item.tab)).toEqual(['home', 'operations', 'reports', 'more'])
  })

  it('Faturas não fica na barra inferior (vira tela empilhada acessada por "Mais")', () => {
    expect(FOOTER_TABS.some((item) => item.route === 'invoices')).toBe(false)
  })

  it('a aba "Mais" leva para settings', () => {
    expect(FOOTER_TABS.find((item) => item.tab === 'more')?.route).toBe('settings')
  })

  it('cada destino tem route, label e icon definidos', () => {
    for (const item of FOOTER_TABS) {
      expect(typeof item.route).toBe('string')
      expect(item.route.length).toBeGreaterThan(0)
      expect(typeof item.label).toBe('string')
      expect(item.label.length).toBeGreaterThan(0)
      expect(typeof item.icon).toBe('string')
      expect(item.icon.length).toBeGreaterThan(0)
    }
  })
})

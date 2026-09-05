import { describe, expect, it } from 'vitest'

import { FOOTER_TABS, resolveChrome } from './chrome'

describe('resolveChrome', () => {
  it('home: tab + toolbar center + activeTab home', () => {
    expect(resolveChrome({ kind: 'tab', toolbar: 'center', tab: 'home' })).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showSettings: true,
      toolbar: 'center',
      title: '',
      activeTab: 'home',
      parent: 'home',
      showCenterLabel: false,
    })
  })

  it('operations: tab + toolbar center + activeTab operations + title Lançamentos', () => {
    expect(
      resolveChrome({ kind: 'tab', toolbar: 'center', tab: 'operations', title: 'Lançamentos' }),
    ).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showSettings: true,
      toolbar: 'center',
      title: 'Lançamentos',
      activeTab: 'operations',
      parent: 'home',
      showCenterLabel: false,
    })
  })

  it('invoices: tab + toolbar title + activeTab invoices', () => {
    expect(
      resolveChrome({ kind: 'tab', toolbar: 'title', tab: 'invoices', title: 'Faturas' }),
    ).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showSettings: true,
      toolbar: 'title',
      title: 'Faturas',
      activeTab: 'invoices',
      parent: 'home',
      showCenterLabel: false,
    })
  })

  it('operations-by-category: tab + toolbar title + activeTab reports + showCenterLabel (SHELL-04)', () => {
    expect(
      resolveChrome({
        kind: 'tab',
        toolbar: 'title',
        tab: 'reports',
        title: 'Operações por categoria',
        centerLabel: true,
      }),
    ).toEqual({
      kind: 'tab',
      showFooter: true,
      showFab: true,
      showBack: false,
      showSettings: true,
      toolbar: 'title',
      title: 'Operações por categoria',
      activeTab: 'reports',
      parent: 'home',
      showCenterLabel: true,
    })
  })

  it('settings: detail + showBack + sem rodapé/fab/engrenagem + parent home', () => {
    expect(resolveChrome({ kind: 'detail', title: 'Configurações', parent: 'home' })).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showSettings: false,
      toolbar: 'title',
      title: 'Configurações',
      activeTab: null,
      parent: 'home',
      showCenterLabel: false,
    })
  })

  it('recurrence: detail + parent settings', () => {
    expect(
      resolveChrome({ kind: 'detail', title: 'Operações recorrentes', parent: 'settings' }),
    ).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showSettings: false,
      toolbar: 'title',
      title: 'Operações recorrentes',
      activeTab: null,
      parent: 'settings',
      showCenterLabel: false,
    })
  })

  it('not-found: detail + parent home', () => {
    expect(
      resolveChrome({ kind: 'detail', title: 'Página não encontrada', parent: 'home' }),
    ).toEqual({
      kind: 'detail',
      showFooter: false,
      showFab: false,
      showBack: true,
      showSettings: false,
      toolbar: 'title',
      title: 'Página não encontrada',
      activeTab: null,
      parent: 'home',
      showCenterLabel: false,
    })
  })

  it('meta vazio (sem kind) → detail com parent home (SHELL-01 AC7 / BACK-02 AC4)', () => {
    const chrome = resolveChrome({})
    expect(chrome.kind).toBe('detail')
    expect(chrome.showBack).toBe(true)
    expect(chrome.showFooter).toBe(false)
    expect(chrome.showFab).toBe(false)
    expect(chrome.showSettings).toBe(false)
    expect(chrome.activeTab).toBeNull()
    expect(chrome.parent).toBe('home')
  })

  it('toolbar center declarado numa rota detail resolve para title (só é center em tab)', () => {
    const chrome = resolveChrome({ kind: 'detail', toolbar: 'center', title: 'X' })
    expect(chrome.toolbar).toBe('title')
  })

  it('centerLabel ausente → showCenterLabel falso', () => {
    expect(resolveChrome({ kind: 'tab', tab: 'invoices' }).showCenterLabel).toBe(false)
  })
})

describe('FOOTER_TABS', () => {
  it('contém exatamente 4 destinos, nesta ordem: home, operations, invoices, reports (TAB-02 AC4)', () => {
    expect(FOOTER_TABS.map((item) => item.tab)).toEqual([
      'home',
      'operations',
      'invoices',
      'reports',
    ])
  })

  it('nenhum destino "Mais" (SET-01 AC3)', () => {
    expect(FOOTER_TABS.some((item) => item.label === 'Mais')).toBe(false)
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

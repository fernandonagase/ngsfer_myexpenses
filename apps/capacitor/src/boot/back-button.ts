import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { defineBoot } from '#q-app/wrappers'

import { resolveHardwareBack } from 'src/router/chrome'
import { hasAppHistory } from 'src/composables/useAppNavigation'

export default defineBoot(({ router }) => {
  if (!Capacitor.isNativePlatform()) return

  void App.addListener('backButton', () => {
    const action = resolveHardwareBack(router.currentRoute.value.meta, {
      hasAppHistory: hasAppHistory(router),
      overlayOpen: document.querySelector('.q-dialog, .q-menu') !== null,
      routeName: (router.currentRoute.value.name as string | null) ?? null,
    })

    if (action.type === 'replace') {
      void router.replace({ name: action.name })
    } else if (action.type === 'exit') {
      void App.exitApp()
    }
    // 'ignore' e 'back': o handler do Quasar já cuida (fecha overlay / window.history.back())
  })
})

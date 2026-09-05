import { useRoute, useRouter, type Router } from 'vue-router'

import { resolveBackTarget } from 'src/router/chrome'

export function hasAppHistory(router: Router): boolean {
  return Boolean(router.options.history.state.back)
}

export function useAppNavigation() {
  const router = useRouter()
  const route = useRoute()

  function goBack() {
    const target = resolveBackTarget(route.meta, hasAppHistory(router))
    if (target.type === 'back') {
      router.back()
    } else {
      void router.replace({ name: target.name })
    }
  }

  function goToSettings() {
    void router.push({ name: 'settings' })
  }

  return { goBack, goToSettings }
}

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { defineBoot } from '#q-app/wrappers'

export default defineBoot(async ({ router }) => {
  if (!Capacitor.isNativePlatform()) return

  await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const operationDate = action.notification.extra?.operationDate as string | undefined
    if (operationDate) {
      void router.push({ name: 'operations', query: { date: operationDate } })
    } else {
      void router.push({ name: 'operations' })
    }
  })
})

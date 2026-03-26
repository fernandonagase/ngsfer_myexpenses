import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import dayjs from 'dayjs'
import { BRL } from '@ngsfer-myexpenses/utils'
import { MoreThanOrEqual } from 'typeorm'

import { getOperationRepository } from 'src/databases/repositories/operation-repository'

const DEFAULT_NOTIFICATION_TIME = '09:00'
const DEFAULT_DAYS_BEFORE = 0
const MAX_NOTIFICATIONS = 50

async function checkAndRequestPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false

  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true

  const result = await LocalNotifications.requestPermissions()
  return result.display === 'granted'
}

function buildNotificationBody(valueInCents: number, date: string, daysBefore: number): string {
  const value = BRL(Math.abs(valueInCents) / 100).format()
  const isIncome = valueInCents > 0

  if (daysBefore === 0) {
    return isIncome ? `${value} prevista para hoje` : `${value} vence hoje`
  }
  if (daysBefore === 1) {
    return isIncome ? `${value} prevista para amanhã` : `${value} vence amanhã`
  }
  const formattedDate = dayjs(date).format('DD/MM')
  return isIncome ? `${value} prevista para ${formattedDate}` : `${value} vence em ${formattedDate}`
}

async function rescheduleAll(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const granted = await checkAndRequestPermissions()
  if (!granted) return

  const today = dayjs().format('YYYY-MM-DD')
  const operationRepository = getOperationRepository()

  const operations = await operationRepository.find({
    where: {
      notificationEnabled: true,
      date: MoreThanOrEqual(today),
    },
  })

  // Cancela todas as notificações pendentes
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications })
  }

  if (operations.length === 0) return

  const now = dayjs()

  // Calcula notificações válidas (trigger no futuro)
  const toSchedule = operations
    .map((op) => {
      const daysBefore = op.notificationDaysBefore ?? DEFAULT_DAYS_BEFORE
      const time = op.notificationTime ?? DEFAULT_NOTIFICATION_TIME
      const [hours, minutes] = time.split(':').map(Number)

      const triggerDate = dayjs(op.date)
        .subtract(daysBefore, 'day')
        .hour(hours ?? 9)
        .minute(minutes ?? 0)
        .second(0)
        .millisecond(0)

      if (triggerDate.isBefore(now)) return null

      const isIncome = op.valueInCents > 0
      const title = isIncome ? `Receita: ${op.description}` : `Despesa: ${op.description}`
      const body = buildNotificationBody(op.valueInCents, op.date, daysBefore)

      return {
        id: op.id,
        title,
        body,
        schedule: { at: triggerDate.toDate() },
        extra: { operationDate: op.date },
      }
    })
    .filter((n) => n !== null)

  if (toSchedule.length === 0) return

  // Prioriza as mais próximas e limita ao cap
  toSchedule.sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime())
  const capped = toSchedule.slice(0, MAX_NOTIFICATIONS)

  await LocalNotifications.schedule({
    notifications: capped as Parameters<typeof LocalNotifications.schedule>[0]['notifications'],
  })
}

export const notificationService = {
  checkAndRequestPermissions,
  rescheduleAll,
}

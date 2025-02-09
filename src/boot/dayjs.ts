import { defineBoot } from '#q-app/wrappers'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import localeData from 'dayjs/plugin/localeData'

export default defineBoot(() => {
  dayjs.locale('pt-br')
  dayjs.extend(localeData)
  dayjs().localeData()
})

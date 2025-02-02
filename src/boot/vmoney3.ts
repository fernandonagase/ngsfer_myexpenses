import { defineBoot } from '#q-app/wrappers'
import { Money3Directive } from 'v-money3'

export default defineBoot(({ app }) => {
  app.directive('money3', Money3Directive)
})

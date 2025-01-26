import { defineBoot } from '#q-app/wrappers'

import { initialize } from 'src/persistence/myExpensesDao'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli-vite/boot-files
export default defineBoot(async (/* { app, router, ... } */) => {
  await initialize()
})

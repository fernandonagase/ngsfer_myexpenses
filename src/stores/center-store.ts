import { defineStore } from 'pinia'

import type { Center } from 'src/databases/entities/expenses'

export const useCenterStore = defineStore('center', {
  state: () => ({
    center: null as Center | null,
  }),

  getters: {},

  actions: {},
})

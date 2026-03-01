<template>
  <q-tabs v-model="tab" class="text-teal">
    <q-tab name="Saída" icon="north_east" label="Saída" />
    <q-tab name="Entrada" icon="south_west" label="Entrada" />
  </q-tabs>
  <q-tab-panels v-model="tab" animated>
    <q-tab-panel name="Saída">
      <q-list separator>
        <q-item v-for="category in categoryStore.datasetOutput" :key="category.id">
          <q-item-section>
            <q-item-label>
              {{ category.name }}
              <q-badge v-if="category.isDefault" label="Padrão" class="q-ml-xs" />
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn icon="more_vert" size="12px" flat dense round>
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="categoryStore.editCategory(category)">
                    <q-item-section>Editar</q-item-section>
                    <q-item-section side>
                      <q-icon name="edit" size="xs" />
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="categoryStore.removeCategory(category)">
                    <q-item-section>Excluir</q-item-section>
                    <q-item-section side>
                      <q-icon name="delete" size="xs" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
        <q-item v-ripple clickable @click="categoryStore.addCategory({ type: tab })">
          <q-item-section>Novo</q-item-section>
          <q-item-section side><q-icon name="add" /></q-item-section>
        </q-item>
      </q-list>
    </q-tab-panel>
    <q-tab-panel name="Entrada">
      <q-list separator>
        <q-item v-for="category in categoryStore.datasetInput" :key="category.id">
          <q-item-section>
            <q-item-label>
              {{ category.name }}
              <q-badge v-if="category.isDefault" label="Padrão" class="q-ml-xs" />
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn icon="more_vert" size="12px" flat dense round>
              <q-menu>
                <q-list style="min-width: 100px">
                  <q-item clickable v-close-popup @click="categoryStore.editCategory(category)">
                    <q-item-section>Editar</q-item-section>
                    <q-item-section side>
                      <q-icon name="edit" size="xs" />
                    </q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="categoryStore.removeCategory(category)">
                    <q-item-section>Excluir</q-item-section>
                    <q-item-section side>
                      <q-icon name="delete" size="xs" />
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>
        <q-item v-ripple clickable @click="categoryStore.addCategory({ type: tab })">
          <q-item-section>Novo</q-item-section>
          <q-item-section side><q-icon name="add" /></q-item-section>
        </q-item>
      </q-list>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useCategoryStore } from 'src/stores/category-store'

const categoryStore = useCategoryStore()

const tab = ref<'Entrada' | 'Saída'>('Saída')
</script>

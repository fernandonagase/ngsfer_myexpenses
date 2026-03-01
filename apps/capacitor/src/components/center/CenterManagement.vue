<script setup lang="ts">
import { useCenterStore } from 'src/stores/center-store'

const centerStore = useCenterStore()
</script>

<template>
  <q-list separator>
    <q-item v-for="center in centerStore.centers" :key="center.id">
      <q-item-section>
        <q-item-label>
          {{ center.name }} <q-badge v-if="center.isDefaultCenter" label="Padrão" class="q-ml-xs" />
          <q-badge v-if="!center.isActive" label="Inativo" color="grey-8" class="q-ml-xs" />
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn icon="more_vert" size="12px" flat dense round>
          <q-menu>
            <q-list style="min-width: 100px">
              <q-item clickable v-close-popup @click="centerStore.editCenter(center)">
                <q-item-section>Editar</q-item-section>
                <q-item-section side>
                  <q-icon name="edit" size="xs" />
                </q-item-section>
              </q-item>
              <template v-if="!center.isDefaultCenter">
                <q-item
                  v-if="center.isActive"
                  clickable
                  v-close-popup
                  @click="centerStore.softRemoveCenter(center)"
                >
                  <q-item-section>Inativar</q-item-section>
                  <q-item-section side>
                    <q-icon name="block" size="xs" />
                  </q-item-section>
                </q-item>
                <q-item
                  v-else
                  clickable
                  v-close-popup
                  @click="centerStore.reactivateCenter(center)"
                >
                  <q-item-section>Reativar</q-item-section>
                  <q-item-section side>
                    <q-icon name="check_circle" size="xs" />
                  </q-item-section>
                </q-item>
              </template>
              <q-item
                v-if="!center.isDefaultCenter"
                clickable
                v-close-popup
                @click="centerStore.removeCenter(center)"
              >
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
    <q-item
      v-if="centerStore.centers.length < 5"
      v-ripple
      clickable
      @click="centerStore.addCenter()"
    >
      <q-item-section>Novo</q-item-section>
      <q-item-section side><q-icon name="add" /></q-item-section>
    </q-item>
  </q-list>
</template>

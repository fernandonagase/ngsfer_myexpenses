<template>
  <q-dialog ref="dialogRef" position="bottom" @hide="onDialogHide">
    <BottomSheetDialog title="Escolher categoria" @dismiss="onDialogCancel">
      <div class="category-picker">
        <q-input
          v-model="query"
          dense
          outlined
          placeholder="Buscar categoria"
          class="category-picker__search"
          autofocus
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
          <template v-slot:append>
            <q-icon v-if="query" name="cancel" class="cursor-pointer" @click="query = ''" />
          </template>
        </q-input>

        <q-list class="category-picker__list" separator>
          <q-item
            v-for="category in filteredCategories"
            :key="category.id"
            clickable
            v-ripple
            class="category-picker__item"
            :class="{ 'category-picker__item--selected': category.id === selected?.id }"
            @click="onDialogOK(category)"
          >
            <q-item-section avatar>
              <div class="category-picker__avatar" :style="avatarStyle(category)">
                {{ initial(category.name) }}
              </div>
            </q-item-section>
            <q-item-section :style="{ color: category.id === selected?.id ? accent : undefined }">
              {{ category.name }}
            </q-item-section>
            <q-item-section v-if="category.id === selected?.id" side>
              <q-icon name="check" :style="{ color: accent }" />
            </q-item-section>
          </q-item>

          <div v-if="filteredCategories.length === 0" class="category-picker__empty">
            Nenhuma categoria com “{{ query }}”
          </div>
        </q-list>
      </div>
    </BottomSheetDialog>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDialogPluginComponent } from 'quasar'

import BottomSheetDialog from 'src/components/BottomSheetDialog.vue'
import type { Category } from 'src/databases/entities/expenses'

const props = defineProps<{
  categories: Category[]
  selected: Category | null
  accent: string
}>()

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const query = ref('')

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const filteredCategories = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return props.categories
  return props.categories.filter((category) => normalize(category.name).includes(q))
})

function initial(name: string) {
  return name.charAt(0).toUpperCase()
}

function avatarStyle(category: Category) {
  const isSelected = category.id === props.selected?.id
  return {
    background: isSelected ? `${props.accent}1f` : 'rgba(0, 0, 0, 0.06)',
    color: isSelected ? props.accent : 'rgba(0, 0, 0, 0.54)',
  }
}
</script>

<style lang="scss" scoped>
.category-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
}

.category-picker__list {
  overflow-y: auto;
}

.category-picker__item {
  border-radius: 12px;
}

.category-picker__item--selected {
  background: rgba(0, 0, 0, 0.03);
}

.category-picker__avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
}

.category-picker__empty {
  padding: 28px 8px;
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
}
</style>

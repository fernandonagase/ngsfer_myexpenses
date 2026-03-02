<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), {
  label: 'Nenhum item encontrado',
})
</script>

<template>
  <div class="text-center q-gutter-md">
    <img src="undraw_no-data_ig65.svg" alt="" width="648" height="632" class="empty-list-img" />
    <p>{{ label }}</p>
  </div>
</template>

<style lang="scss" scoped>
.empty-list-img {
  width: min(100%, 200px);
  height: auto;
}
</style>

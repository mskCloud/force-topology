<template>
  <ul class="wrapper-info">
    <li v-for="item in list" :key="item.label">
      <span>{{ item.label }}</span>
      ---
      <span>{{ item.value }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
const props = defineProps<{
  data?: Object
}>()

const list = computed(() =>
  props.data
    ? Object.keys(props.data)
        .map((key) =>
          props.data[key]
            ? {
                label: key,
                value: props.data[key]
              }
            : null
        )
        .filter((f) => f)
    : []
)
</script>

<style scoped lang="less">
.wrapper-info {
  height: 48px;
  line-height: 48px;
  // border-bottom: 4px solid #747d8c;
  list-style: none;
  display: flex;
  li {
    margin-right: 16px;
    span:first-child {
      font-weight: bold;
    }
    span:last-child {
      color: #ff4757;
    }
  }
}
</style>

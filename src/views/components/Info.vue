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

type ObjStr = {
  [key: string]: any
}

const props = defineProps<{
  data: ObjStr
}>()

const list = computed(() =>
  props.data
    ? Object.keys(props.data)
        .map((key) => {
          return {
            label: key,
            value: props.data[key]
          }
        })
        .filter((f) => f.value)
    : []
)
</script>

<style scoped lang="less">
.wrapper-info {
  height: 48px;
  line-height: 48px;
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

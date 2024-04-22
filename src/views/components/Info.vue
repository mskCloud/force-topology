<template>
  <div class="info">
    <span class="info-title">状态:</span>
    <NTag v-for="item in list" :key="item.label" type="primary" :bordered="false">
      {{ item.value }}
    </NTag>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NTag } from 'naive-ui'

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

<style scoped lang="scss">
.info {
  display: flex;
  height: 3rem;
  align-items: center;
  list-style: none;
  padding: 0 1rem;
  &-title {
    font-size: 1.2rem;
    font-weight: bold;
  }
  > * {
    margin-right: 0.5rem;
  }
}
</style>

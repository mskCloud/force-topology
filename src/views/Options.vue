<template>
  <ul class="wrapper-opt">
    <li
      class="btn"
      v-for="item in List"
      :key="item.key"
      :style="{
        backgroundColor: item.value ? '#ff6b81' : '',
        color: item.value ? '#f1f2f6' : ''
      }"
      @click="handleEmit(item)"
    >
      {{ item.label }}
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits(['handleEvent'])

const List = ref<Array<Item>>([
  { label: '编辑模式', key: 'isEdit', value: false },
  { label: '固定节点', key: 'fixed', value: false },
  { label: '重新生成节点', key: 'reset' },
  { label: '添加节点', key: 'addNode' },
  // { label: '删除节点', key: 'delNode' },
  { label: '连线', key: 'openLink', value: false },
  { label: '框选', key: 'openSelect', value: false },
  { label: '节点高亮', key: 'hightlight', value: false },
  { label: '全屏', key: 'fullscreen', value: false },
  { label: '临时', key: 'temp', value: false }
])

const isEdit = computed(() => List.value.find((f) => f.key === 'isEdit')?.value)
const isLink = computed(() => List.value.find((f) => f.key === 'openLink')?.value)
const isSelect = computed(() => List.value.find((f) => f.key === 'openSelect')?.value)
const isHghtlight = computed(() => List.value.find((f) => f.key === 'hightlight')?.value)
const isFixed = computed(() => List.value.find((f) => f.key === 'fixed')?.value)

function handleEmit(eventItem: Item) {
  if (eventItem.key === 'isEdit') {
    eventItem.label = eventItem.value ? '编辑模式' : '预览模式'
  }
  emit('handleEvent', eventItem)
}

defineExpose({
  isEdit,
  isLink,
  isSelect,
  isHghtlight,
  isFixed
})
</script>

<style lang="less">
.wrapper-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-basis: 200px;
  list-style: none;
  .btn {
    width: 100%;
    line-height: 32px;
    text-align: center;
    color: #57606f;
    cursor: pointer;
    &:hover {
      color: #2ed573;
    }
  }
}
</style>

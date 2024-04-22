<template>
  <ul class="wrapper-opt">
    <li v-for="item in List" :key="item.key" @click="handleEmit(item)">
      <NButton secondary :type="item.value ? 'primary' : 'default'"> {{ item.label }} </NButton>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'

const emit = defineEmits(['handleEvent'])

const List = ref<Item[]>([
  { label: '编辑模式', key: 'isEdit', value: false },
  { label: '固定节点', key: 'fixed', value: false },
  { label: '重新生成节点', key: 'reset' },
  { label: '添加节点', key: 'addNode' },
  { label: '删除节点', key: 'delNode' },
  { label: '连线', key: 'openLink', value: false },
  { label: '框选', key: 'openSelect', value: false },
  { label: '节点高亮', key: 'highlight', value: false },
  { label: '全屏', key: 'fullscreen', value: false }
])
const isEdit = computed(() => List.value.find((f) => f.key === 'isEdit')?.value)
const isLink = computed(() => List.value.find((f) => f.key === 'openLink')?.value)
const isSelect = computed(() => List.value.find((f) => f.key === 'openSelect')?.value)
const isHighlight = computed(() => List.value.find((f) => f.key === 'highlight')?.value)
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
  isHighlight,
  isFixed
})
</script>

<style lang="scss" scoped>
.wrapper-opt {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  align-content: space-evenly;
  min-width: 10rem;
  list-style: none;
  font-size: 1rem;
  user-select: none;

  li {
    padding: 0 0.3rem;
    line-height: 32px;
    text-align: center;
    color: #57606f;
    cursor: pointer;
    text-wrap: nowrap;
  }
}

@media screen and (max-width: 400px) {
  .wrapper-opt {
    width: auto;
    flex-direction: row;
    flex-wrap: wrap;

    li {
      width: auto;
    }
  }
}
</style>

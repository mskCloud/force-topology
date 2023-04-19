<template>
  <div>
    <div style="display: flex">
      <button
        class="btn"
        v-for="item in List"
        :key="item.key"
        :style="{
          backgroundColor: item.value ? 'red' : 'initial',
        }"
        @click="handleEvent(item)"
      >
        {{ item.label }}
      </button>
    </div>
    <div id="topology" style="height: 600px; border: 10px solid #000"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { nodes, links } from './mock'
import Topology from './topology'

type Item = {
  label: string
  key: string
  value?: any
}
const topology = ref<Topology | null>(null)
const List = ref<Array<Item>>([
  { label: '编辑模式', key: 'isEdit', value: false },
  { label: '固定节点', key: 'stop', value: false },
  { label: '添加节点', key: 'addNode' },
  { label: '删除节点', key: 'delNode' },
  { label: '连线', key: 'openLink', value: false },
  { label: '框选', key: 'openSelect', value: false },
  { label: '节点高亮', key: 'hightlight', value: false },
  { label: '全屏', key: 'fullscreen', value: false },
])

onMounted(() => {
  topology.value = new Topology('#topology', nodes, links, {})
  topology.value.init()
})
// onUnmounted(() => {
//   topology.value.unmountedTopology()
// })

function handleEvent(item: Item) {
  if (item.key === 'isEdit') {
    topology.value.stop()
    item.value = !item.value
  }
  if (item.key === 'stop') {
    topology.value.stop()
    item.value = !item.value
  }
  if (item.key === 'addNode') {
  }
  if (item.key === 'delNode') {
  }
  if (item.key === 'openLink') {
  }
  if (item.key === 'openSelect') {
    item.value
      ? topology.value.boxSelectCancel()
      : topology.value.boxSelect((res) => {
          console.log(res)
        })
    item.value = !item.value
  }
  if (item.key === 'hightlight') {
  }
  if (item.key === 'fullscreen') {
  }
}
</script>

<style lang="less">
@import './UxTopology.less';

.btn {
  height: 32px;
  width: 80px;
  cursor: pointer;
}
</style>

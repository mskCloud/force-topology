<template>
  <div style="display: flex; margin-bottom: 16px">
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { nodes, links, generateNode, generateLink, generateLinkById } from './mock'
import Topology from './topology'

type Item = {
  label: string
  key: string
  value?: any
}
const topology = ref<Topology | null>(null)
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
])

onMounted(() => {
  nodes.push(...generateNode(10))
  links.push(...generateLink(10))

  topology.value = new Topology('#topology', nodes, links, {})
  topology.value.init()
})

onUnmounted(() => {
  topology.value.unmountedTopology()
})

function handleEvent(item: Item) {
  if (item.key === 'isEdit') {
    item.value ? topology.value.start() : topology.value.stop()
    item.value = !item.value
  }
  if (item.key === 'fixed') {
    item.value = !item.value
    topology.value.fixedNode(item.value)
  }
  if (item.key === 'reset') {
    nodes.length = 0
    links.length = 0
    nodes.push(...generateNode(10))
    links.push(...generateLink(10))
    topology.value.updateNodesAndLinks(nodes, links)
  }
  if (item.key === 'addNode') {
    nodes.push(...generateNode(4))
    links.push(...generateLink(4))
    topology.value.updateNodesAndLinks(nodes, links)
  }
  if (item.key === 'delNode') {
  }
  if (item.key === 'openLink') {
    if (!List.value.find((item) => item.key === 'isEdit').value) {
      alert('请先打开编辑模式')
      return
    }
    item.value = !item.value
    if (item.value) {
      topology.value.addLinks((res) => {
        links.push(generateLinkById(res.source.id, res.target.id))
        topology.value.updateNodesAndLinks(nodes, links)
      })
    } else {
      topology.value.addLinksCancel()
    }
  }
  if (item.key === 'openSelect') {
    if (!List.value.find((item) => item.key === 'isEdit').value) {
      alert('请先打开编辑模式')
      return
    }
    item.value = !item.value
    if (item.value) {
      topology.value.boxSelect((res) => {
        console.log(res)
      })
    } else {
      topology.value.boxSelectCancel()
    }
  }
  if (item.key === 'hightlight') {
    item.value = !item.value
    topology.value.hightlight(item.value)
  }
  if (item.key === 'fullscreen') {
    topology.value.fullScreen()
  }
}
</script>

<style lang="less">
@import './UxTopology.less';

.btn {
  height: 32px;
  min-width: 80px;
  padding: 0 4px;
  cursor: pointer;
}
</style>

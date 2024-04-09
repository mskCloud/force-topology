<template>
  <div class="wrapper">
    <Options ref="optionsRef" @handle-event="handleEvent" />
    <main>
      <Info :data="status"></Info>
      <div id="topology" />
    </main>
    <DataPane
      :node-data="nodes"
      :link-data="links"
      :config-data="topologyConfig"
      @handle-data-pane-opt="handleDataPaneOpt"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watchEffect, onMounted, onUnmounted } from 'vue'
import { generateNode, generateLink, generateLinkById } from './mock'
import Topology, { TopoLink } from './topology'
import { TopoNode, TopoLinkRaw, TopoLinkData, TopoConfig } from './topology'
import Options from './components/Options.vue'
import DataPane from './components/DataPane.vue'
import Info from './components/Info.vue'

const nodes = ref<TopoNode[]>([])
const links = ref<TopoLinkRaw[]>([])
const topology = shallowRef<Topology | null>(null)
const optionsRef = ref()
const topologyConfig = ref<TopoConfig>({
  node_radius: 30
})
const status = ref({
  状态1: '预览中',
  状态2: '',
  状态3: '',
  状态4: '',
  状态5: ''
})

if (!nodes.value.length && !links.value.length) {
  nodes.value.push(...generateNode(10, nodes.value))
  links.value.push(...generateLink(10, links.value, nodes.value))
}

onMounted(() => {
  topology.value = new Topology('#topology', nodes.value, links.value, topologyConfig.value)
  topology.value.init()

  watchEffect(() => {
    status.value.状态1 = optionsRef.value.isEdit ? '编辑中' : '预览中'
    status.value.状态2 = optionsRef.value.isLink ? '连线中' : ''
    status.value.状态3 = optionsRef.value.isSelect ? '框选中' : ''
    status.value.状态4 = optionsRef.value.isHghtlight ? '节点高亮中' : ''
    status.value.状态5 = optionsRef.value.isFixed ? '节点固定中' : ''
  })
})

onUnmounted(() => {
  topology.value?.unmountedTopology()
})

function handleEvent(item: Item) {
  if (item.key === 'isEdit') {
    item.value ? topology.value?.start() : topology.value?.stop()
    item.value = !item.value
  }

  if (item.key === 'fixed') {
    item.value = !item.value
    topology.value?.fixedNode(item.value)
  }

  if (item.key === 'reset') {
    nodes.value.length = 0
    links.value.length = 0
    nodes.value.push(...generateNode(10, nodes.value))
    links.value.push(...generateLink(10, links.value, nodes.value))
    topology.value?.updateNodesAndLinks(nodes.value, links.value)
  }

  if (item.key === 'addNode') {
    nodes.value.push(...generateNode(5, nodes.value))
    links.value.push(...generateLink(5, links.value, nodes.value))
    topology.value?.updateNodesAndLinks(nodes.value, links.value)
  }

  if (item.key === 'delNode') {
    const selectedNodes = topology.value?.selectedNodes || []
    topology.value?.deleteNodesAndLinksById(selectedNodes?.map((m) => m.id))
  }

  if (item.key === 'openLink') {
    if (!optionsRef.value.isEdit) {
      alert('请先打开编辑模式')
      return
    }
    item.value = !item.value
    if (item.value) {
      topology.value?.addLinks((res: TopoLinkData) => {
        links.value.push(generateLinkById(links.value, res.source.id, res.target.id))
        topology.value?.updateNodesAndLinks(nodes.value, links.value)
      })
    } else {
      topology.value?.addLinksCancel()
    }
  }

  if (item.key === 'openSelect') {
    if (!optionsRef.value.isEdit) {
      alert('请先打开编辑模式')
      return
    }
    item.value = !item.value
    if (item.value) {
      topology.value?.boxSelect((res: TopoNode[], links: TopoLink) => {
        console.log(res)
      })
    } else {
      topology.value?.boxSelectCancel()
    }
  }

  if (item.key === 'hightlight') {
    item.value = !item.value
    topology.value?.hightlight(item.value)
  }

  if (item.key === 'fullscreen') {
    topology.value?.fullScreen()
  }
  if (item.key === 'temp') {
    topology.value?.getViewPortSize()
  }
}

function handleDataPaneOpt(type: string, node: TopoNode) {
  if (type === 'select') {
    topology.value?.locateToNodeById(node)
  }
  if (type === 'del') {
    topology.value?.deleteNodesAndLinksById([node.id])
  }
}
</script>

<style lang="less">
@import './topology.less';
.wrapper {
  display: flex;
  height: 100vh;
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    #topology {
      flex: 1;
      border: 16px solid #95a5a6;
      border-radius: 4px;
    }
  }
}
</style>

<template>
  <div class="wrapper">
    <header>
      <span class="title">2D力引导图</span>
      <Options ref="optionsRef" @handle-event="handleEvent" />
    </header>
    <div class="container">
      <main>
        <Info :data="status"></Info>
        <div id="topology" />
      </main>
      <aside>
        <DataPane
          :node-data="nodes"
          :link-data="links"
          :config-data="topologyConfig"
          @on-watch-config="watchConfig"
        />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, watchEffect, onMounted, onUnmounted } from 'vue'
import { nodeApi, linkApi, newLinkById } from './mock'
import Topology, { TopoLink } from './topology'
import { TopoNode, TopoLinkRaw, TopoLinkData, TopoConfig } from './topology'
import Options from './components/Options.vue'
import DataPane from './components/DataPane.vue'
import Info from './components/Info.vue'

const nodes = ref<TopoNode[]>([])
const links = ref<TopoLinkRaw[]>([])
const topology = shallowRef<Topology | null>(null)
const optionsRef = ref()
const topologyConfig = ref<TopoConfig>({})
const status = ref({
  状态1: '预览中',
  状态2: '',
  状态3: '',
  状态4: '',
  状态5: ''
})

if (!nodes.value.length && !links.value.length) {
  nodes.value.push(...nodeApi(10, nodes.value))
  links.value.push(...linkApi(5, links.value, nodes.value))
}

onMounted(() => {
  topology.value = new Topology('#topology', nodes.value, links.value, topologyConfig.value)
  topology.value.init()

  watchEffect(() => {
    status.value.状态1 = optionsRef.value.isEdit ? '编辑中' : '预览中'
    status.value.状态2 = optionsRef.value.isLink ? '连线中' : ''
    status.value.状态3 = optionsRef.value.isSelect ? '框选中' : ''
    status.value.状态4 = optionsRef.value.isHighlight ? '节点高亮中' : ''
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
    nodes.value.push(...nodeApi(10, nodes.value))
    links.value.push(...linkApi(5, links.value, nodes.value))
    topology.value?.updateNodesAndLinks(nodes.value, links.value)
  }

  if (item.key === 'addNode') {
    nodes.value.push(...nodeApi(5, nodes.value))
    links.value.push(...linkApi(5, links.value, nodes.value))
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
        links.value.push(newLinkById(links.value, res.source.id, res.target.id))
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
      topology.value?.boxSelect((nodes: TopoNode[], links: TopoLink) => {
        console.log(nodes, links)
      })
    } else {
      topology.value?.boxSelectCancel()
    }
  }

  if (item.key === 'highlight') {
    item.value = !item.value
    topology.value?.setHighlight(item.value)
  }

  if (item.key === 'fullscreen') {
    topology.value?.fullScreen()
  }
  if (item.key === 'temp') {
    topology.value?.getViewPortSize()
  }
}

function watchConfig(config: TopoConfig) {
  topology.value?.loadConfig(config)
  // if (type === 'select') {
  //   topology.value?.locateToNodeById(node)
  // }
  // if (type === 'del') {
  //   topology.value?.deleteNodesAndLinksById([node.id])
  // }
}
</script>

<style lang="scss" scoped>
.shadow-md {
  box-shadow: 0.2rem 0.2rem 1rem rgba(125, 125, 125, 0.2),
    -0.1rem -0.1rem 1rem rgba(126, 126, 126, 0.1);
}
.round-md {
  border-radius: 0.5rem;
}
.wrapper {
  height: 100vh;
  user-select: none;
  overflow: hidden;
  header {
    display: flex;
    height: 5rem;
    @extend .shadow-md;
    .title {
      font-size: 1.5rem;
      line-height: 5rem;
      font-weight: bold;
      text-wrap: nowrap;
      padding: 0 1rem;
    }
  }
  .container {
    display: flex;
    height: calc(100vh - 5rem);
    padding: 1rem;
    overflow: hidden;
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 50%;
      margin-right: 1rem;
      @extend .shadow-md;
      @extend .round-md;
      overflow: hidden;

      #topology {
        flex: 1;
        border: 16px solid #95a5a6;
        border-radius: 4px;
      }
    }
    aside {
      height: 100%;
      @extend .shadow-md;
      @extend .round-md;
    }
  }
}

@media screen and (max-width: 400px) {
  .wrapper {
    // height: auto;
    flex-direction: column;
  }
}
</style>

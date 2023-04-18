<template>
  <div>
    <div id="topology" style="height: 600px; border: 10px solid #000"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Topology from './topology'
import { nodes, links } from './mock'

const topology = ref<Topology | null>(null)
const toolList = ref([
  { label: '启动', key: 'start' },
  { label: '停止', key: 'stop' },
  { label: '连线', key: 'link' },
  { label: '框选', key: 'select' },
])

onMounted(() => {
  topology.value = new Topology('#topology', nodes, links, {})
  topology.value.init()
})
onUnmounted(() => {
  topology.value = null
})
</script>

<style lang="less">
@import './UxTopology.less';
</style>

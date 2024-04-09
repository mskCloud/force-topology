<template>
  <div>
    <ul class="wrapper-data">
      <li>
        <h3 @click="collapseNode = !collapseNode">Node数据{{ collapseNode ? '[-]' : '[+]' }}</h3>
        <ol v-if="collapseNode">
          <li v-for="node in nodeData" :key="node.id">
            <div>{{ node.name }}</div>
            <div>
              <span @click="optDataPane('select', node)">选择</span>
              <span @click="optDataPane('del', node)">删除</span>
            </div>
          </li>
        </ol>
      </li>
      <li>
        <h3 @click="collapseLink = !collapseLink">Link数据{{ collapseLink ? '[-]' : '[+]' }}</h3>
        <ol v-if="collapseLink">
          <li v-for="link in linkData" :key="link.id">
            <div>{{ link.name }}</div>
          </li>
        </ol>
      </li>
      <li>
        <h3 @click="collapseConfig = !collapseConfig">
          Config数据{{ collapseConfig ? '[-]' : '[+]' }}
        </h3>
        <ul v-if="collapseConfig">
          <li v-for="(item, key) in configData" :key="key">
            <strong>{{ key }}</strong>
            <span>{{ item }}</span>
          </li>
        </ul>
      </li>
    </ul>
    <div></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TopoNode, TopoLinkData, TopoLinkRaw } from '../topology'
const props = defineProps<{
  nodeData?: TopoNode[]
  linkData?: TopoLinkData[] | TopoLinkRaw[]
  configData?: any
}>()
const emit = defineEmits(['handleDataPaneOpt'])

const collapseNode = ref(false)
const collapseLink = ref(false)
const collapseConfig = ref(false)

function optDataPane(type: string, node: TopoNode) {
  emit('handleDataPaneOpt', type, node)
}
</script>

<style scoped lang="less">
.wrapper-data {
  max-width: 15rem;
  padding: 0 1rem 0 1.5rem;
  overflow: auto;
  ol,
  ul {
    li {
      display: flex;
      justify-content: space-between;
      line-height: 1.8;
      span {
        padding-left: 0.5rem;
        cursor: pointer;
        &:hover {
          color: #ff4757;
        }
      }
    }
  }
}

@media screen and (max-width: 400px) {
  h3 {
    font-size: 1rem;
  }
}
</style>

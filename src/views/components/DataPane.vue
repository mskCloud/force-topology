<template>
  <div class="data-pane">
    <div class="data-pane-header">配置控制</div>
    <div class="config-form">
      <!-- <div class="config-item">
        <div class="config-item-title">节点半径</div>
        <NInputNumber v-model:value="config.nodeRadius"></NInputNumber>
      </div>
      <div class="config-item">
        <div class="config-item-title">节点间隔</div>
        <NInputNumber v-model:value="config.nodeGap"></NInputNumber>
      </div> -->
      <div class="config-item">
        <div class="config-item-title">节点环颜色</div>
        <NColorPicker v-model:value="config.nodeRingColor"></NColorPicker>
      </div>
      <div class="config-item">
        <div class="config-item-title">线条颜色</div>
        <NColorPicker v-model:value="config.linkColor"></NColorPicker>
      </div>
      <div class="config-item">
        <div class="config-item-title">高亮颜色</div>
        <NColorPicker v-model:value="config.highlightColor"></NColorPicker>
      </div>
      <div class="config-item">
        <div class="config-item-title">背景颜色</div>
        <NColorPicker v-model:value="config.containerBg"></NColorPicker>
      </div>
      <div class="config-item">
        <div class="config-item-title">背景（编辑）颜色</div>
        <NColorPicker v-model:value="config.containerBgEdit"></NColorPicker>
      </div>
      <!-- <div class="config-item">
        <div class="config-item-title">缩放限制</div>
        <NInputNumber v-model:value="config.nodeGap"></NInputNumber>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { NColorPicker, NInputNumber } from 'naive-ui'
import { TopoNode, TopoLinkData, TopoLinkRaw, TopoConfig } from '../topology'
import { debounced } from '../tools'
const props = defineProps<{
  nodeData?: TopoNode[]
  linkData?: TopoLinkData[] | TopoLinkRaw[]
  configData?: any
}>()
const emit = defineEmits(['onWatchConfig'])

const config = ref<TopoConfig>({
  linkColor: '#ff7979',
  nodeRadius: 30,
  nodeGap: 4,
  nodeRingColor: '#ff7979',
  highlightColor: '#22a6b3',
  containerBg: '#f6e58d',
  containerBgEdit: '#c7ecee'
})
watchEffect(() => {
  emit('onWatchConfig', config.value)
})
</script>

<style scoped lang="scss">
.data-pane {
  height: 100%;
  min-width: 20rem;
  padding: 1rem 0.8rem;
  &-header {
    height: 3rem;
    color: rgba(39, 174, 96, 1);
    font-size: 1.3rem;
    font-weight: bold;
    margin-bottom: 7px;
    border-bottom: 4px solid rgba(52, 73, 94, 1);
  }

  .config-form {
    height: calc(100% - 3rem);
    padding-right: 1rem;
    overflow: auto;
    .config-item {
      margin-bottom: 0.6rem;
      &-title {
        font-size: 1rem;
        font-weight: bold;
        margin-bottom: 7px;
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

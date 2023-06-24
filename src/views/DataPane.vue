<template>
  <ul class="wrapper-data">
    <li>
      <h3 @click="collapseNode = !collapseNode">Node数据{{ collapseNode ? '[-]' : '[+]' }}</h3>
      <ol v-if="collapseNode">
        <li v-for="node in nodeData" :key="node.id" style="border-bottom: 4px solid #ff6b81">
          <div v-for="(item, key) in node" :key="key">
            <strong>{{ key }}</strong>
            <span>{{ item }}</span>
          </div>
        </li>
      </ol>
    </li>
    <li>
      <h3 @click="collapseLink = !collapseLink">Link数据{{ collapseLink ? '[-]' : '[+]' }}</h3>
      <ul v-if="collapseLink">
        <div v-for="node in linkData" :key="node.id" style="border-bottom: 4px solid #ff6b81">
          <li v-for="(item, key) in node" :key="key">
            <template v-if="typeof item === 'object'">
              <strong>{{ key }}</strong>
              <ol>
                <li v-for="(i, k) in item" :key="k">
                  <strong>{{ k }}</strong>
                  <span>{{ i }}</span>
                </li>
              </ol>
            </template>
            <template v-else>
              <strong>{{ key }}</strong>
              <span>{{ item }}</span>
            </template>
          </li>
        </div>
      </ul>
    </li>
    <li>
      <h3 @click="collapseConfig = !collapseConfig">
        Config数据{{ collapseConfig ? '[-]' : '[+]' }}
      </h3>
      <ul v-if="collapseConfig">
        <li v-for="(item, key) in configData" :key="key" style="border-bottom: 4px solid #ff6b81">
          <template v-if="typeof item === 'object'">
            <strong>{{ key }}</strong>
            <ol>
              <li v-for="(i, k) in item" :key="k">
                <strong>{{ k }}</strong>
                <span>{{ i }}</span>
              </li>
            </ol>
          </template>
          <template v-else>
            <strong>{{ key }}</strong>
            <span>{{ item }}</span>
          </template>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps<{
  nodeData?: any
  linkData?: any
  configData?: any
}>()

const collapseNode = ref(false)
const collapseLink = ref(false)
const collapseConfig = ref(false)
</script>

<style scoped lang="less">
.wrapper-data {
  width: 300px;
  height: 100%;
  min-height: 500px;
  padding: 0 0 0 24px;
  overflow: auto;
  ol,
  ul {
    font-size: 12px;
    padding: 0 12px;
    li {
      strong {
        display: inline-block;
        min-width: 60px;
      }
      &:last-child {
        border: none;
      }
    }
  }
}
</style>

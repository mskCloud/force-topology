import { links, nodes } from './../../../knower/src/views/D3/mock'
import svg from '../assets/vue.svg'
import img from '../assets/7.jpg'
// export const nodes = []

// export const links = []

export function generateNode(nums: number = 1, nodes: any) {
  const temp = []
  let count = nodes.length
  for (let i = 0; i < nums; i++) {
    count++
    temp.push({
      id: `id_${count}`,
      name: `Node_${count}`,
      img: count % 2 ? svg : img
    })
  }
  return temp
}

export function generateLink(nums: number = 1, links: any, nodes?: any) {
  const temp = []
  let count = links.length
  const type = ['1-1,1-N', 'N-1', 'N-N']
  for (let i = 0; i < nums; i++) {
    let a = Math.floor(Math.random() * nodes.length)
    let b = Math.ceil(Math.random() * nodes.length)
    let c = Math.floor(Math.random() * 3)
    if (a === b || !a || !b) {
      i--
      continue
    }
    count++
    temp.push({
      id: `link_${count}`,
      name: `关系：${a}=>${b}`,
      source: `id_${a}`,
      sourceId: `id_${a}`,
      target: `id_${b}`,
      targetId: `id_${b}`,
      linkType: type[c],
      tipInfo: {
        id: `id is link_${count}`,
        name: `name is 关系：${a}=>${b}`,
        source: `source is id_${a}`,
        target: `target is id_${b}`,
        linkType: `linkType is ${type[c]}`
      }
    })
  }
  return temp
}

export function generateLinkById(links: any,source: string, target: string, type: string = '1-N') {
  return {
    id: `link_${links.length}`,
    index: links.length,
    name: `关系：${source}=>${target}`,
    source: source,
    sourceId: source,
    target: target,
    targetId: target,
    linkType: type,
    tipInfo: {
      id: `id is link_${links.length}`,
      name: `name is 关系：${source}=>${target}`,
      source: `source is ${source}`,
      target: `target is ${target}`,
      linkType: `linkType is ${type}`
    }
  }
}

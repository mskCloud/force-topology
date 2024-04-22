import { TopoNode, TopoLinkRaw } from './topology'
import svg from '../assets/vue.svg'

function randomIcon(type = 'image') {
  if (type !== 'image') {
    return svg
  }
  const r = Math.floor(Math.random() * 43 + 1)
  return `/src/assets/tieba/${r}.gif`
}

export function nodeApi(nums: number = 1, nodes: any) {
  const temp: TopoNode[] = []
  let count = nodes.length
  for (let i = 0; i < nums; i++) {
    count++
    temp.push({
      id: `id_${count}`,
      name: `Node_${count}`,
      img: count === 1 ? svg : randomIcon(),
      x: 0,
      y: 0
    })
  }
  return temp
}

export function linkApi(nums: number = 1, links: TopoLinkRaw[], nodes: TopoNode[]) {
  if (nodes.length < 1) {
    return []
  }
  const temp: TopoLinkRaw[] = []
  let count = links.length

  for (let i = 0; i < nodes.length - 1; i++) {
    const current = nodes[i]
    const next = nodes[i + 1]
    temp.push(link(current.id, next.id))
    count++
  }

  for (let i = 0; i < nums; i++) {
    let a = Math.floor(Math.random() * nodes.length)
    let b = Math.floor(Math.random() * nodes.length)
    if (a === b) {
      i--
      continue
    }
    temp.push(link(nodes[a].id, nodes[b].id))
    count++
  }

  function link(a: string, b: string) {
    let c = Math.floor(Math.random() * 3)
    const type = ['1-1', '1-N', 'N-1', 'N-N']

    return {
      id: `link_${count}`,
      name: `${a.slice(3)}=>${b.slice(3)}`,
      source: a,
      target: b,
      linkType: type[c],
      tipInfo: {
        id: `link_${count}`,
        name: `${a}=>${b}`,
        source: `source is ${a}`,
        target: `target is ${b}`,
        linkType: `linkType is ${type[c]}`
      }
    }
  }
  return temp
}

export function newLinkById(
  links: TopoLinkRaw[],
  source: string,
  target: string,
  type: string = '1-N'
) {
  return {
    id: `link_${links.length}`,
    index: links.length,
    name: `${source}=>${target}`,
    source: source,
    sourceId: source,
    target: target,
    targetId: target,
    linkType: type,
    tipInfo: {
      id: `link_${links.length}`,
      name: `${source}=>${target}`,
      source: `source is ${source}`,
      target: `target is ${target}`,
      linkType: `linkType is ${type}`
    }
  }
}

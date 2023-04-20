export const nodes = []
export const links = []

export function generateNode(nums: number = 1) {
  const temp = []
  let count = nodes.length
  for (let i = 0; i < nums; i++) {
    count++
    temp.push({
      id: `id_${count}`,
      name: `Node_${count}`,
    })
  }
  return temp
}

export function generateLink(nums: number = 1) {
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
      tipInfo: {},
    })
  }
  return temp
}

export function generateLinkById(source: string, target: string, type: string = '1-N') {
  return {
    id: `link_${links.length}`,
    index: links.length,
    name: `关系：${source}=>${target}`,
    source: source,
    sourceId: source,
    target: target,
    targetId: target,
    linkType: type,
    tipInfo: {},
  }
}

import {
  forceSimulation,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  ForceLink,
  ForceCollide,
  ForceManyBody,
  ForceCenter
} from 'd3-force'
import { select, selectAll, Selection } from 'd3-selection'
import { zoom as zoomD3, zoomIdentity, D3ZoomEvent } from 'd3-zoom'
import { svg, blob } from 'd3-fetch'
import { drag as dragD3, D3DragEvent } from 'd3-drag'
import { transition } from 'd3-transition'

// import D3 from 'd3'
const cssVar: ObjectStr = {
  '--color-primary': '#ff6b81',
  '--color-secondary': 'rgba(46, 204, 113,1.0)',
  '--color-primary-active': '#1e90ff',
  '--bg-color': 'white',
  '--bg-color-stop': '#f1f2f6',
  '--border-width': '4px',

  '--node-ring-width': '4px',
  '--node-ring-color': '#ff6b81',
  '--node-ring-color-active': '#1e90ff',
  '--node-bg-color': 'white',
  '--node-bg-color-active': '#1e90ff',

  '--link-width': '2px',
  '--link-width-active': '6px',
  '--link-line-color': 'rgba(155, 89, 182,1.0)',
  '--link-line-color-active': 'rgba(155, 89, 182,1.0)',
  '--link-text-size': '12px',
  '--link-text-color': 'rgba(46, 204, 113,1.0)',
  '--link-text-color-active': '#1e90ff',

  '--text-size-md': '14px',
  '--text-color-primary': 'rgba(44, 62, 80,1.0)',

  '--tip-bg-color': '#3a3a3a',
  '--tip-text-color': 'white',
  '--tip-text-size': '12px',
  '--shadow-md': '2px 2px 10px rgba(10,10,10,0.2)'
}

function injectCssVar(target: Selection<any, any, any, any>) {
  for (const key in cssVar) {
    if (Object.prototype.hasOwnProperty.call(cssVar, key)) {
      target.style(key, cssVar[key])
    }
  }
  return target
}

type ObjectStr = {
  [key: string]: any
}
type Point = {
  x: number
  y: number
}

export interface TopoNode extends SimulationNodeDatum {
  id: string
  name: string
  img?: string
  x: number
  y: number
}
export interface TopoLink extends SimulationLinkDatum<TopoNode> {
  id: string
  name: string
  source: string | TopoNode
  target: string | TopoNode
  linkType: string
  tipInfo?: ObjectStr
}
export interface TopoLinkRaw extends TopoLink {
  source: string
  target: string
}

// 拓扑图生成后，source、target将自动被设置成Node的data,用此类型覆盖初始时source/target为string/number的类型
export interface TopoLinkData extends TopoLink {
  source: TopoNode
  target: TopoNode
}

// 默认配置
const CONFIG = {
  // 画布
  containerBg: '#f6e58d',
  containerBgEdit: '#c7ecee',
  // 节点相关
  nodeRadius: 30,
  nodeGap: 3,
  nodeRingColor: '#ff7979',
  isRound: true,
  // 线条相关
  linkColor: '#ff7979',
  linkWidth: 2,
  fontSize: 12,
  textGap: 8,
  arrowSize: 4,
  isOutLine: false,
  // 功能
  zoom: 0,
  minZoom: 0,
  maxZoom: 0,
  highlightColor: '#22a6b3'
}
type TopoConfigInner = typeof CONFIG
export type TopoConfig = Partial<TopoConfigInner>

type LinkConfig = {
  lineLength: number
  textWidth: number
  textHeight: number
  angle: number
  type: string | 'N-N' | '1-N' | 'N-1' | '1-1'
}

export default class Topology {
  private el: string
  private nodes: Array<TopoNode>
  private links: Array<TopoLink>
  private config: TopoConfigInner
  private container: Selection<Element, any, any, any> | null
  private viewport: Selection<SVGSVGElement, any, any, any> | null
  private graph: Selection<SVGGElement, any, any, any> | null
  private graphNodes: Selection<SVGGElement, TopoNode, any, any> | null
  private graphLinks: Selection<SVGGElement, TopoLinkData, any, any> | null
  private simulation: Simulation<TopoNode, TopoLink> | null
  private forceLink: ForceLink<TopoNode, TopoLink> | null
  private forceCollide: ForceCollide<TopoNode> | null
  private forceManyBody: ForceManyBody<TopoNode> | null
  private forceCenter: ForceCenter<TopoNode> | null
  private nodeTotal: Selection<SVGGElement, TopoNode, any, any> | null
  private linkTotal: Selection<SVGGElement, TopoLink, any, any> | null
  private linkLineOut: Selection<SVGPathElement, any, any, any> | null
  private linkLineIn: Selection<SVGPathElement, any, any, any> | null
  private linkLineText: Selection<SVGTextElement, any, any, any> | null
  private radius: number
  private cbList: Map<string | symbol, Function>
  private scaleMap: any
  public selectedNodes: TopoNode[] | []
  public selectedLinks: TopoLink[] | []
  public isStartTopology: boolean
  public isAddLink: boolean
  public isBoxSelect: boolean
  public isHighlight: boolean
  public isZoom: boolean
  public isLocateNode: boolean
  public locateNodeId: string
  public isFixedNode: boolean
  constructor(el: string, nodes: TopoNode[] = [], links: TopoLink[] = [], config: TopoConfig) {
    this.el = el
    this.nodes = nodes
    this.links = links
    this.config = Object.assign(CONFIG, config)
    // 容器
    this.container = null
    // 视口
    this.viewport = null
    // 画布
    this.graph = null
    this.graphNodes = null
    this.graphLinks = null
    // 力导模型
    this.simulation = null
    this.forceCollide = null
    this.forceLink = null
    this.forceManyBody = null
    this.forceCenter = null
    // nodeTotal 整体
    this.nodeTotal = null
    // linkTotal 整体
    this.linkTotal = null
    this.linkLineOut = null
    this.linkLineIn = null
    this.linkLineText = null
    // 节点半径
    this.radius = 30
    // 被选中节点以及连线
    this.selectedNodes = []
    this.selectedLinks = []
    // 是否启动拓扑图（编辑）
    this.isStartTopology = true
    // 是否可以连线
    this.isAddLink = false
    // 是否可以框选
    this.isBoxSelect = false
    // 是否高亮
    this.isHighlight = false
    // 是否可以画布移动和缩放
    this.isZoom = true
    // 回调函数集合
    this.cbList = new Map()
    // 比例尺-窗口至画布的映射
    this.scaleMap = { x: 0, y: 0, k: 1 }
    // 是否定位节点
    this.isLocateNode = false
    // 定位节点id
    this.locateNodeId = ''
    // 固定节点
    this.isFixedNode = false
  }

  // 初始化拓扑图
  public init() {
    if (!this.el) return console.error('请设置el值')
    this.initGraph()
    if (!this.container) return console.error('挂载svg节点失败')
    this.initSimulation()
    if (!this.simulation) {
      return
    }
    this.updatedNodeAndLink()
  }

  // 初始化画布
  private initGraph() {
    this.container = select(this.el)
    this.container.html('')
    if (this.container.node()) {
      this.loadConfig(this.config)
      this.appendSvg()
    }
  }

  // 初始化力导模型
  private initSimulation() {
    if (!this.viewport) {
      return
    }
    const { width, height } = this.getViewPortSize()
    this.forceCollide = forceCollide()
      .radius(this.config.nodeRadius * this.config.nodeGap)
      .strength(0.7)
      .iterations(1)

    this.forceLink = forceLink<TopoNode, TopoLink>(this.links)
      .distance(100)
      .strength(0.7)
      .id((d: TopoNode) => d.id)

    this.forceManyBody = forceManyBody().distanceMin(10).distanceMax(100).strength(30)
    this.forceCenter = forceCenter(width / 2, height / 2)

    this.simulation = forceSimulation<TopoNode, TopoLink>(this.nodes)
      .force('collide', this.forceCollide)
      .force('charge', this.forceManyBody)
      .force('center', this.forceCenter)
      .force('link', this.forceLink)
      .on('tick', this.tick())
  }

  // 核心方法
  private appendSvg() {
    if (!this.container) {
      return
    }
    this.viewport = this.container
      .append('svg')
      .attr('height', '100%')
      .attr('width', '100%')
      .attr('class', 'topology-container')
      .style('background-color', 'var(--bg-color)')
      .style('cursor', 'move')
      .style('min-width', '240px')
      .style('min-height', '180px')
      .on('click', () => {
        this.callBack('right_Event_close')
      })
    this.viewport.call(this.zoomFit()).on('dblclick.zoom', null)
    this.graph = this.viewport.append('g').attr('class', 'graph')
    this.graphLinks = this.graph.append('g').attr('class', 'graph-links')
    this.graphNodes = this.graph.append('g').attr('class', 'graph-nodes')
  }
  private appendNode() {
    if (!this.nodeTotal) return

    const _this = this
    this.nodeTotal = this.nodeTotal
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .attr('filter', 'drop-shadow(2px 2px 2px rgb(0 0 0 / 0.3))')
      .on('dblclick', function (event) {
        console.log('触发：节点双击键事件')
      })
      .on('mouseenter', function (event) {
        _this.highlight(this, true)
      })
      .on('mouseleave', function (event) {
        _this.highlight(this, false)
      })
      // 解决右键之后在拖拽图片，删除按钮不消失问题
      .on('mousedown', function () {
        _this.callBack('right_Event_close')
      })
      .on('contextmenu', function (event) {
        console.log('触发：节点右键事件')
        event.preventDefault()
      })
      .call(this.dragNode())
  }

  private appendNodeClass() {
    if (!this.nodeTotal) return

    const imgWidth = this.config.nodeRadius * 1.5
    const imgHeight = this.config.nodeRadius * 1.5
    this.nodeTotal
      .append('rect')
      .style('fill', 'var(--node-ring-color-active)')
      .style('stroke', 'var(--node-ring-color)')
      .style('opacity', '0')
      .attr('width', this.config.nodeRadius * 2)
      .attr('height', this.config.nodeRadius * 2)
      .attr('x', `-${this.config.nodeRadius}px`)
      .attr('y', `-${this.config.nodeRadius}px`)
    this.nodeTotal
      .append('circle')
      .style('fill', 'var(--node-bg-color)')
      .style('stroke', 'var(--node-ring-color)')
      .style('stroke-width', 'var(--node-ring-width)')
      .attr('r', this.config.nodeRadius)
    this.nodeTotal
      .append('text')
      .style('fill', 'var(--text-color-primary)')
      .style('font-size', 'var(--text-size-md)')
      .style('text-anchor', 'middle')
      .attr('y', `${this.config.nodeRadius + 20}px`)
      .text((d) => d.name)
    // 处理图片以及svg
    this.nodeTotal.each(function (d) {
      if (d.img) {
        const node = select<SVGGElement, TopoNode>(this)
        blob(d.img).then((res) => {
          if (['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(res.type)) {
            node
              .append('image')
              .style('clip-path', 'circle(50%)')
              .style('width', `${imgWidth}px`)
              .style('height', `${imgHeight}px`)
              .attr('x', `-${imgWidth / 2}px`)
              .attr('y', `-${imgHeight / 2}px`)
              .attr('xlink:href', d.img ? d.img : '')
          }
          if (res.type === 'image/svg+xml') {
            svg(URL.createObjectURL(res)).then((res) => {
              let svg = res.querySelector('svg')
              if (svg && node) {
                svg.setAttribute('width', `${imgWidth}px`)
                svg.setAttribute('height', `${imgHeight}px`)
                node
                  .append('g')
                  .style('fill', 'var(--color-primary)')
                  .attr('transform', `translate(-${imgWidth / 2}, -${imgHeight / 2})`)
                  .node()
                  ?.append(svg)
              }
            })
          }
        })
      }
    })
  }

  private appendNodeToGraph() {
    this.appendNode()
    this.appendNodeClass()
  }

  private appendLink() {
    if (!this.linkTotal) return

    const _this = this
    let tip: Selection<SVGGElement, any, any, any> | null = null
    this.linkTotal = this.linkTotal
      .enter()
      .append('g')
      .attr('class', 'link')
      .on('mouseover', function (event) {
        let x = event.offsetX + 16
        let y = event.offsetY + 16
        const linkData = select<SVGGElement, TopoLinkData>(this).select('.link-path').datum()
        if (linkData.hasOwnProperty('tipInfo')) {
          tip = _this.appendLinkTips(x, y, linkData.tipInfo || {}) || null
        }
      })
      .on('mouseout', function (event) {
        tip && tip.remove()
      })
      .on('mouseenter', function (event) {
        if (!_this.isHighlight && !_this.isBoxSelect) {
          select(this).select('.link-path').style('stroke-width', 'var(--link-width-active)')
        }
      })
      .on('mouseleave', function (event) {
        if (!_this.isHighlight && !_this.isBoxSelect) {
          select(this).select('.link-path').style('stroke-width', 'var(--link-width)')
        }
      })
      // 解决右键之后在拖拽图片，删除按钮不消失问题
      .on('mousedown', function () {
        _this.callBack('right_Event_close')
      })
      .on('contextmenu', function (event) {
        console.log('触发：links右键事件')
        event.preventDefault()
      })
  }
  private appendLinkClass() {
    const _this = this
    function appendLinkPath() {
      return (
        _this.linkTotal &&
        _this.linkTotal
          .append('path')
          .attr('class', 'link-path')
          .style('fill', 'var(--link-line-color)')
          .style('stroke', 'var(--link-line-color)')
          .style('stroke-width', 'var(--link-width)')
      )
    }
    function appendLinkText() {
      return (
        _this.linkTotal &&
        _this.linkTotal
          .append('text')
          .attr('class', 'link-text')
          .style('fill', 'var(--link-text-color)')
          .style('font-size', 'var(--link-text-size)')
          .style('text-anchor', 'middle')
          .text(function (d) {
            return d.name
          })
      )
    }
    return {
      linkPath: appendLinkPath(),
      linkText: appendLinkText()
    }
  }

  private appendLinkTips(x: number, y: number, content: ObjectStr) {
    if (!this.viewport) return

    const tipInfo = Object.keys(content)
    if (!tipInfo.length) return
    let tipWidth = 150
    let tipHeight = 90
    const tip = this.viewport.append('g').attr('class', 'graph-tip')
    tip
      .append('rect')
      .attr('class', 'tip')
      .style('fill', 'var(--tip-bg-color)')
      .style('stroke-width', 'var(--border-width)')
      .attr('width', tipWidth)
      .attr('height', tipHeight)
      .attr('x', x)
      .attr('y', y)
      .attr('rx', 4)
      .attr('ry', 4)
    Object.keys(content).map((key, index) => {
      tip
        .append('text')
        .attr('class', 'tip-text')
        .style('fill', 'var(--tip-text-color)')
        .style('font-size', 'var(--tip-text-size)')
        .attr('x', x + 10)
        .attr('y', y + 20 * (index + 1))
        .text(function (d) {
          return `${key}：${content[key]}`
        })
    })
    // 处理tip的宽度问题
    selectAll<SVGTextElement, SVGGElement>('#topology .tip-text').each(function (
      this: SVGTextElement
    ) {
      const text = select(this).node()
      if (text) {
        let width = text.getBBox().width
        if (width > tipWidth) {
          tipWidth = width
        }
      }
    })
    select('.tip').attr('width', tipWidth + 16)
    // 处理tip边界问题
    const { width: svgWidth, height: svgHeight } = this.getViewPortSize()
    tip.attr('transform', function () {
      return `translate(
        -${x + tipWidth + 16 >= svgWidth ? tipWidth + 16 : 0},
        -${y + tipHeight + 16 >= svgHeight ? tipHeight + 16 : 0}
      )`
    })
    return tip
  }

  private appendLinkToGraph() {
    this.appendLink()
    return this.appendLinkClass()
  }

  private updatedNode() {
    if (!this.graphNodes) {
      return
    }
    this.nodeTotal = this.graphNodes.selectChildren<SVGGElement, TopoNode>().data(this.nodes)
    this.appendNodeToGraph()
    // this.nodeTotal = this.nodeTotal.merge(this.nodeTotal)
  }

  private updatedLink() {
    if (!this.graphLinks) return
    this.linkTotal = this.graphLinks
      .selectChildren<SVGGElement, TopoLinkData>()
      .data(this.links, function () {
        // todo 这里会错误显示
        return 'id'
      })
    if (!this.linkTotal) {
      return
    }
    const { linkPath, linkText } = this.appendLinkToGraph()

    this.linkLineIn = this.graphLinks.selectChildren('.link-path')
    this.linkLineIn = linkPath && linkPath.merge(this.linkLineIn)

    this.linkLineText = this.graphLinks.selectChildren('.link-text')
    this.linkLineText = linkText && linkText.merge(this.linkLineText)
  }

  public updatedNodeAndLink() {
    if (!this.simulation) {
      return
    }
    this.simulation.nodes(this.nodes)
    this.forceLink?.links(this.links)
    this.updatedNode()
    this.updatedLink()
  }

  private tick() {
    const _this = this
    return function () {
      _this.tickNode.call(_this)
      _this.tickLink.call(_this)
    }
  }

  private tickNode() {
    if (this.nodeTotal) {
      this.nodeTotal.attr('transform', function (d) {
        return `translate(${d.x || 0}, ${d.y || 0})`
      })
    }
  }

  private tickLink() {
    if (this.linkTotal) {
      const _this = this
      this.linkTotal.each(function (this: SVGGElement) {
        let link = select<SVGGElement, TopoLinkData>(this)
        let link_path = link.select('.link-path')
        let link_text = link.select<SVGGElement>('.link-text')

        let source: Point = { x: 0, y: 0 }
        let target: Point = { x: 0, y: 0 }

        const linkData: LinkConfig = {
          angle: 0,
          lineLength: 0,
          type: 'N-N',
          textWidth: link_text.node()?.getBBox().width || 0,
          textHeight: link_text.node()?.getBBox().height || 0
        }

        if (!['1-1', '1-N', 'N-1', 'N-N'].includes(linkData.type)) {
          return console.error('link 箭头类型设置错误')
        }

        link_path.attr('d', function (d: TopoLinkData) {
          linkData.type = d.linkType
          linkData.angle = _this.rotation(
            { x: d.source.x!, y: d.source.y! },
            { x: d.target.x!, y: d.target.y! }
          )
          source = _this.rotatePoint(
            { x: d.source.x, y: d.source.y },
            { x: d.source.x, y: d.source.y! + _this.config.nodeRadius + 2 },
            90 - linkData.angle
          )
          target = _this.rotatePoint(
            { x: d.target.x!, y: d.target.y! },
            { x: d.target.x, y: d.target.y! + _this.config.nodeRadius + 2 },
            -90 - linkData.angle
          )
          linkData.lineLength = _this.getLink_length(source, target, linkData)
          return _this.getLink_D(source, target, linkData)
        })
        link_text.attr('transform', function () {
          return _this.getLink_text(source, target, linkData)
        })
      })
    }
  }

  // 画布缩放与移动
  private zoomFit(flag = false) {
    const _this = this
    function zoom(event: D3ZoomEvent<SVGGElement, TopoNode>) {
      if (!_this.isZoom && !flag) return
      _this.scaleMap.x = event.transform.x
      _this.scaleMap.y = event.transform.y
      _this.scaleMap.k = event.transform.k
      _this.graph &&
        _this.graph.attr(
          'transform',
          `translate(${event.transform.x}, ${event.transform.y}) scale(${event.transform.k})`
        )
      _this.callBack('right_Event_close')
    }
    return zoomD3<SVGSVGElement, any>().scaleExtent([0.4, 3]).on('zoom', zoom)
  }

  /**
   * 功能方法
   */

  // 更新Topology
  public updateNodesAndLinks(nodes: TopoNode[], links?: TopoLink[]) {
    if (!this.simulation) {
      return
    }
    this.simulation.stop()
    nodes && (this.nodes = nodes)
    links && (this.links = links)
    this.nodeTotal?.remove()
    this.linkTotal?.remove()
    this.updatedNodeAndLink()
    this.simulation.restart()
  }

  // 删除某节点
  public deleteNodesAndLinksById(id: string[]) {
    if (!this.simulation) {
      return
    }
    this.simulation.stop()
    if (Array.isArray(id)) {
      this.nodes = this.nodes.filter((v) => !id.some((i) => i === v.id))
      this.links = this.links.filter(
        (v) =>
          !id.some((i) => {
            if (typeof v.source === 'string' || typeof v.target === 'string') {
              return v.source === i || v.target === i
            } else {
              return v.source.id === i || v.target.id === i
            }
          })
      )
    } else {
      this.nodes = this.nodes.filter((v) => v.id !== id)
      this.links = this.links.filter((v) => {
        if (typeof v.source === 'string' || typeof v.target === 'string') {
          return !(v.source === id || v.target === id)
        } else {
          return !(v.source.id === id || v.target.id === id)
        }
      })
    }
    this.nodeTotal?.remove()
    this.linkTotal?.remove()
    this.updatedNodeAndLink()
    this.simulation.restart()
  }

  // 暂停force活动
  public stop() {
    this.simulation?.stop()
    this.isStartTopology = false
    select('.topology-container')
      .style('background-color', 'var(--bg-color-stop)')
      .style('cursor', 'initial')
  }

  // 重新启动force活动
  public start() {
    this.simulation?.restart()
    this.isStartTopology = true
    this.isAddLink = false
    this.isBoxSelect = false
    this.viewport?.call(this.zoomFit()).on('dblclick.zoom', null)
    select('.topology-container')
      .attr('class', 'topology-container')
      .style('background-color', 'var(--bg-color)')
      .style('cursor', 'move')
  }

  //  开启节点高亮显示
  public setHighlight(isOpen?: boolean) {
    this.isHighlight = isOpen === undefined ? !this.isHighlight : isOpen
  }

  //  添加连线
  public addLinks(cb: Function) {
    if (this.isStartTopology) return
    this.isAddLink = true
    this.isZoom = true
    this.isBoxSelect = false
    this.callBackRegister('_addLink', cb)
  }

  //  取消连线
  public addLinksCancel() {
    this.isAddLink = false
    this.isZoom = true
    selectAll('#topology .temp-link-v50').remove()
    this.callBackClear('_addLink')
  }

  //  框选
  public boxSelect(cb: Function) {
    if (this.isStartTopology) return
    this.isBoxSelect = true
    this.isZoom = false
    this.viewport?.on('.zoom', null)
    this.viewport?.call(this.generateBox())
    this.nodeTotal?.each(function (d) {
      select(this).attr('pointer-events', 'none')
    })
    this.callBackRegister('_boxSelect', cb)
  }

  //  取消框选
  public boxSelectCancel() {
    this.isBoxSelect = false
    this.isZoom = true
    this.selectedNodes = []
    this.nodeTotal?.each(function () {
      select(this).attr('class', 'node')
    })
    this.linkTotal?.each(function () {
      select(this).attr('class', 'link')
    })
    this.callBackClear('_boxSelect')
    selectAll('#topology .temp-box-v50').remove()
    this.viewport?.on('.drag', null)
    this.viewport?.call(this.zoomFit())
    this.nodeTotal?.each(function (d) {
      select(this).attr('pointer-events', 'visiblePoint')
    })
  }

  // 节点拖拽、连线
  // todo 需要解决：当多节点拖拽时，节点同步移动不一致问题
  private dragNode() {
    const _this = this
    // 连线
    let linkTemp: Selection<SVGPathElement, TopoLinkData, any, any>
    let startLink_x = 0
    let startLink_y = 0
    // 多节点移动
    let start_x = 0
    let start_y = 0
    let rel_x = 0
    let rel_y = 0
    let speed = 2.2

    _this.callBack('right_Event_close')

    function dragStart(event: D3DragEvent<SVGGElement, TopoNode, TopoNode>) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (!event.active) _this.simulation?.alphaTarget(0.3).restart()
        if (_this.selectedNodes?.length) {
          start_x = event.x
          start_y = event.y
          multipleDrag(event)
          return
        }
        event.subject.fx = event.subject.x
        event.subject.fy = event.subject.y
      }
      // 添加连线
      if (_this.isAddLink) {
        if (linkTemp) {
          linkTemp.remove()
        }

        if (_this.graphLinks) {
          linkTemp = _this.graphLinks
            .append('g')
            .attr('class', 'link temp-link-v50')
            .append('path')
            .attr('class', 'link-path')
            .style('fill', 'var(--link-line-color)')
            .style('stroke', 'var(--link-line-color)')
            .style('stroke-width', 'var(--link-width)')
        }

        startLink_x = event.subject.x
        startLink_y = event.subject.y
      }
    }
    function drag(event: D3DragEvent<SVGGElement, TopoNode, TopoNode>) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (_this.selectedNodes?.length) {
          multipleDrag(event)
          return
        }
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      // 添加连线
      if (_this.isAddLink) {
        linkTemp?.attr('d', `M ${startLink_x} ${startLink_y} L ${event.x} ${event.y}`)
      }
    }
    function dragEnd(event: D3DragEvent<SVGGElement, TopoNode, TopoNode>) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (!event.active) _this.simulation?.alphaTarget(0)
        // 固定节点
        if (!_this.isFixedNode) {
          event.subject.fx = null
          event.subject.fy = null
        }
      }
      // 添加连线
      if (_this.isAddLink) {
        let end = _this.simulation?.find(event.x, event.y, _this.config.nodeRadius)
        if (end) {
          linkTemp?.attr('d', `M ${startLink_x} ${startLink_y} L ${end.x} ${end.y}`)
          _this.callBack('_addLink', {
            source: event.subject,
            target: end
          })
        } else {
          linkTemp?.remove()
        }
      }
    }
    // 多节点拖拽
    function multipleDrag(event: D3DragEvent<SVGGElement, TopoNode, TopoNode>) {
      if (!_this.selectedNodes?.some((v) => v.id === event.subject.id)) {
        return
      }
      rel_x = event.x - start_x
      rel_y = event.y - start_y
      start_x = event.x
      start_y = event.y
      _this.nodeTotal?.each(function (d) {
        if (_this.selectedNodes?.some((v) => v.id === d.id)) {
          if (d.x) {
            d.fx = d.x + rel_x * speed
          }
          if (d.y) {
            d.fy = d.y + rel_y * speed
          }
        }
      })
    }
    return dragD3<SVGGElement, TopoNode, TopoNode>()
      .on('start', dragStart)
      .on('drag', drag)
      .on('end', dragEnd)
  }

  // 固定节点
  public fixedNode(isFixed?: boolean) {
    if (!this.simulation) {
      return
    }
    this.isFixedNode = isFixed === undefined ? !this.isFixedNode : isFixed
    const n = this.simulation?.nodes()!
    this.simulation?.nodes(
      n.map((v) => {
        v.fx = this.isFixedNode ? v.x : null
        v.fy = this.isFixedNode ? v.y : null
        return v
      })
    )
  }

  // 节点高亮
  private highlight(_this: SVGElement, open: boolean, nodeInfo?: TopoLinkData) {
    if (!this.isHighlight) return
    const curNode = select(_this).datum() as TopoNode
    const relativeNode: string[] = [curNode.id]

    if (open) {
      selectAll<SVGGElement, TopoLinkData>('#topology .link .link-path').each(function (d) {
        const linkPath = select(this)
        let isRelative = true

        // 收集相关节点
        if (d.source.id === curNode.id) {
          relativeNode.push(d.target.id)
        } else if (d.target.id === curNode.id) {
          relativeNode.push(d.source.id)
        } else {
          isRelative = false
        }

        if (isRelative) {
          linkPath.style('stroke', 'var(--link-line-color-active)').style('opacity', '1')
        } else {
          linkPath.style('stroke', 'var(--link-line-color)').style('opacity', '0.3')
        }
      })
      selectAll<SVGGElement, TopoNode>('#topology .node').each(function (d) {
        const node = select(this)
        const circle = node.select('circle')

        if (relativeNode.includes(d.id)) {
          node.style('opacity', '1')
          circle
            .style('fill', 'var(--node-bg-color-active)')
            .style('stroke', 'var(--node-ring-color-active)')
          // 当前节点特殊样式
          if (d.id === curNode.id) {
            circle.style('fill', 'var(--color-primary)').style('stroke', 'var(--color-primary)')
          }
        } else {
          node.style('opacity', '0.3')
          circle.style('fill', 'var(--node-bg-color)').style('stroke', 'var(--node-ring-color)')
        }
      })
    } else {
      selectAll<SVGGElement, TopoLinkData>('#topology .link .link-path')
        .style('stroke', 'var(--link-line-color)')
        .style('opacity', '1')

      selectAll<SVGGElement, TopoNode>('#topology .node').each(function () {
        const node = select(this).style('opacity', '1')
        node
          .select('circle')
          .style('fill', 'var(--node-bg-color)')
          .style('stroke', 'var(--node-ring-color)')
      })
    }
  }
  // 框选时，生成的盒子
  public generateBox() {
    const _this = this
    let box: Selection<SVGPathElement, any, any, any> | null = null
    let boxWidth = 0
    let boxHeight = 0
    let start_x = 0
    let start_y = 0
    let findStart = { x: 0, y: 0 }
    let findEnd = { x: 0, y: 0 }
    let selectedNodes: TopoNode[] = []
    // 开始框选时计算框选盒子的起点坐标及样式
    function dragStart(event: D3DragEvent<SVGSVGElement, any, any>) {
      start_x = event.x
      start_y = event.y
      if (_this.viewport) {
        box = _this.viewport
          .append('path')
          .attr('class', 'box-selected temp-box-v50')
          .attr('fill', 'transparent')
          .attr('stroke', '#000')
          .attr('stroke-dasharray', '5,5')
      }
    }
    // 计算框选的框子的长宽
    function drag(event: D3DragEvent<SVGSVGElement, any, any>) {
      boxWidth = Math.abs(event.x - start_x)
      boxHeight = Math.abs(event.y - start_y)

      if (event.x >= start_x && event.y >= start_y) {
        box?.attr('d', function (d) {
          return `M ${start_x} ${start_y} h ${boxWidth} v ${boxHeight} h -${boxWidth} Z`
        })
        findStart.x = start_x
        findStart.y = start_y
        findEnd.x = start_x + boxWidth
        findEnd.y = start_y + boxHeight
      }
      if (event.x > start_x && event.y < start_y) {
        box?.attr('d', function (d) {
          return `M ${start_x} ${start_y} h ${boxWidth} v -${boxHeight} h -${boxWidth} Z`
        })
        findStart.x = start_x
        findStart.y = start_y - boxHeight
        findEnd.x = start_x + boxWidth
        findEnd.y = start_y
      }

      if (event.x < start_x && event.y > start_y) {
        box?.attr('d', function (d) {
          return `M ${start_x} ${start_y} h -${boxWidth} v ${boxHeight} h ${boxWidth} Z`
        })
        findStart.x = start_x - boxWidth
        findStart.y = start_y
        findEnd.x = start_x
        findEnd.y = start_y + boxHeight
      }

      if (event.x < start_x && event.y < start_y) {
        box?.attr('d', function (d) {
          return `M ${start_x} ${start_y} h -${boxWidth} v -${boxHeight} h ${boxWidth} Z`
        })
        findStart.x = start_x - boxWidth
        findStart.y = start_y - boxHeight
        findEnd.x = start_x
        findEnd.y = start_y
      }

      // 当前被圈中的节点
      selectedNodes = _this.findNodesByBox(findStart, findEnd)

      // 设置选中节点样式
      _this.nodeTotal?.each(function (d) {
        const node = select(this)
        const circle = node.select('circle')
        if (selectedNodes.some((v) => v.id === d.id)) {
          node.style('opacity', '1')
          circle
            .style('fill', 'var(--node-bg-color-active)')
            .style('stroke', 'var(--node-ring-color-active)')
        } else {
          node.style('opacity', '0.3')
          circle.style('fill', 'var(--node-bg-color)').style('stroke', 'var(--node-ring-color)')
        }
      })

      // 设置选中连线样式
      _this.linkTotal?.each(function (d) {
        const sourceId = typeof d.source === 'string' ? d.source : d.source.id
        const targetId = typeof d.target === 'string' ? d.target : d.target.id
        if (
          selectedNodes.some((v) => v.id === sourceId) &&
          selectedNodes.some((v) => v.id === targetId)
        ) {
          select(this).style('stroke', 'var(--link-line-color-active)').style('opacity', '1')
        } else {
          select(this).style('stroke', 'var(--link-line-color)').style('opacity', '0.3')
        }
      })
    }

    // 框选完毕之后执行的操作
    function dragEnd() {
      selectAll('#topology .temp-box-v50').remove()
      _this.selectedNodes = selectedNodes
      _this.selectedLinks = _this.findLinksByNodes(_this.selectedNodes)
      _this.isZoom = false
      _this.nodeTotal?.each(function (d) {
        if (_this.selectedNodes?.find((v) => v.id === d.id)) {
          select(this).attr('pointer-events', 'visiblePoint')
        } else {
          select(this).attr('pointer-events', 'none')
        }
      })
      _this.callBack('_boxSelect', _this.selectedNodes, _this.selectedLinks)
    }
    return dragD3<SVGSVGElement, any>().on('start', dragStart).on('drag', drag).on('end', dragEnd)
  }

  // 全屏
  public fullScreen() {
    let el: any = document.querySelector(this.el)
    let rfs =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullScreen
    if (typeof rfs != 'undefined' && rfs) {
      rfs.call(el)
    }
  }

  // 定位至画布之当前节点
  public locateToNodeById(d: TopoNode) {
    const { width: boxWidth, height: boxHeight } = this.getContainerSize()
    this.viewport
      ?.transition()
      .duration(500)
      .call(
        this.zoomFit(true).transform,
        zoomIdentity.scale(1).translate(boxWidth / 2 - d.x, boxHeight / 2 - d.y)
      )
  }

  // 设置当前节点高亮
  public setNodeHeightLightById(nodeId: string) {
    if (!nodeId) {
      return
    }
    const _this = this
    // 为避免性能问题，所以把取元素属性的变量放循环的外面了(避免触发同步布局事件)
    this.nodeTotal?.each(function (d) {
      if (d.id === nodeId) {
        if (_this.isLocateNode) {
          _this.isLocateNode = false
        }
        select(this)
          .attr('class', 'node active')
          .select('circle')
          .attr('r', _this.config.nodeRadius * 1.1)
      }
    })
  }

  // 卸载拓扑图
  public unmountedTopology() {
    this.stop()
    this.el = ''
    this.nodes = []
    this.links = []
    this.config = CONFIG
    this.container = null
    this.viewport = null
    this.graph = null
    this.graphNodes = null
    this.graphLinks = null
    this.simulation = null
    this.nodeTotal = null
    this.linkTotal = null
    this.linkLineOut = null
    this.linkLineIn = null
    this.linkLineText = null
    this.config.nodeRadius = 20
    this.selectedNodes = []
    this.isStartTopology = true
    this.isAddLink = false
    this.isBoxSelect = false
    this.isHighlight = false
    this.isZoom = true
    this.cbList = new Map()
    this.scaleMap = { x: 0, y: 0, k: 1 }
    this.isLocateNode = false
    this.locateNodeId = ''
    this.isFixedNode = false
  }

  /**
   * 工具类方法
   */

  // 根据x，y坐标来寻找节点
  public findNodeByPoint(x: number, y: number) {
    let mX = this.pointMapSpot(x, y).x
    let mY = this.pointMapSpot(x, y).y
    return this.simulation?.find(mX, mY, this.config.nodeRadius)
  }

  // 根据起始坐标来寻找节点
  public findNodesByBox(start: Point, end: Point) {
    let matrix = this.pointMapMatrix(start, end)
    let startMap = matrix.start
    let endMap = matrix.end

    return this.nodes.filter((v) => {
      if (v.x && v.y) {
        return (
          v.x >= startMap.x - this.config.nodeRadius &&
          v.y >= startMap.y - this.config.nodeRadius &&
          Math.abs(v.x - (startMap.x - this.config.nodeRadius)) <=
            Math.abs(endMap.x + this.config.nodeRadius * 2 - startMap.x) &&
          Math.abs(v.y - (startMap.y - this.config.nodeRadius)) <=
            Math.abs(endMap.y + this.config.nodeRadius * 2 - startMap.y)
        )
      }
    })
  }

  // 根据节点找到相关的连线
  public findLinksByNodes(nodes: string[] | TopoNode[] | string | TopoNode) {
    if (Array.isArray(nodes)) {
      const nodesCopy = nodes.map((m) => {
        if (typeof m === 'object') {
          return m.id
        } else {
          return m
        }
      })
      return this.links.reduce<TopoLink[]>((res, cur) => {
        if (typeof cur.source === 'object' && typeof cur.target === 'object') {
          if (nodesCopy.includes(cur.source.id) && nodesCopy.includes(cur.target.id)) {
            res.push(cur)
          }
        }
        if (typeof cur.source === 'string' && typeof cur.target === 'string') {
          if (nodesCopy.includes(cur.source) && nodesCopy.includes(cur.target)) {
            res.push(cur)
          }
        }
        return res
      }, [])
    } else {
      const nodeCopy = typeof nodes === 'object' ? nodes.id : nodes
      return this.links.reduce<TopoLink[]>((res, cur) => {
        if (typeof cur.source === 'object' && typeof cur.target === 'object') {
          if (nodeCopy === cur.source.id && nodeCopy === cur.target.id) {
            res.push(cur)
          }
        }
        if (typeof cur.source === 'string' && typeof cur.target === 'string') {
          if (nodeCopy === cur.source && nodeCopy === cur.target) {
            res.push(cur)
          }
        }
        return res
      }, [])
    }
  }

  // 坐标映射-点
  private pointMapSpot(x: number, y: number) {
    // 平移计算
    let mX = x - this.scaleMap.x
    let mY = y - this.scaleMap.y

    // 缩放计算
    mX = mX / this.scaleMap.k
    mY = mY / this.scaleMap.k

    return { x: mX, y: mY }
  }
  // 坐标映射-矩阵
  private pointMapMatrix(start: Point, end: Point) {
    let startMap = start
    let endMap = end

    let x = this.scaleMap.x
    let y = this.scaleMap.y
    let k = this.scaleMap.k

    // 平移计算
    startMap.x = startMap.x - x
    startMap.y = startMap.y - y
    endMap.x = endMap.x - x
    endMap.y = endMap.y - y

    // 缩放计算
    let _x = (endMap.x - startMap.x) / k
    let _y = (endMap.y - startMap.y) / k
    startMap.x = startMap.x / k
    startMap.y = startMap.y / k
    endMap.x = startMap.x + _x
    endMap.y = startMap.y + _y

    return { start: startMap, end: endMap }
  }

  // 回调函数
  public callBack<T>(name: string | symbol, ...args: any) {
    if (this.cbList.has(name)) {
      if (this.cbList.get(name)) {
        this.cbList.get(name)?.call(this, ...args)
      } else {
        console.error(`${name.toString()}: 没有对应的回调函数`)
      }
    }
  }
  // 注册回调函数
  public callBackRegister(name: string | symbol, cb: Function) {
    this.cbList.set(name, cb)
  }
  // 清除回调函数
  public callBackClear(name: string | symbol) {
    if (name) {
      this.cbList.delete(name)
      return
    } else {
      this.cbList.clear()
      return
    }
  }
  // 坐标计算
  private rotation(source: Point, target: Point) {
    return (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI
  }
  private rotatePoint(c: Point, p: Point, angle: number) {
    return this.rotate(c.x, c.y, p.x, p.y, angle)
  }
  private rotate(cx: number, cy: number, x: number, y: number, angle: number) {
    let radians = (Math.PI / 180) * angle
    let cos = Math.cos(radians)
    let sin = Math.sin(radians)
    let nx = cos * (x - cx) + sin * (y - cy) + cx
    let ny = cos * (y - cy) - sin * (x - cx) + cy
    return { x: nx, y: ny }
  }
  // 计算并生产 path
  private getLink_D(source: Point, target: Point, linkData: LinkConfig) {
    let angle = this.rotation(source, target)
    let side = this.config.arrowSize || 0
    let lineWidth = this.config.linkWidth || 0
    let lineLength = linkData.lineLength || 0
    let D = ''
    let S_type = linkData.type[0]
    let T_type = linkData.type[2]

    // source 箭头
    let S_a = source
    let S_b = { x: 0, y: 0 }
    let S_c = { x: 0, y: 0 }
    // 双向的双箭头
    if (S_type === 'N') {
      S_b = this.rotatePoint(S_a, { x: S_a.x - side, y: S_a.y + side }, 90 - angle)
      S_c = this.rotatePoint(S_a, { x: S_a.x + side, y: S_a.y + side }, 90 - angle)
    } else if (S_type === '1') {
      // 单向的和无没有箭头
      S_b = this.rotatePoint(S_a, { x: S_a.x, y: S_a.y + side }, 90 - angle)
      S_c = this.rotatePoint(S_a, { x: S_a.x, y: S_a.y + side }, 90 - angle)
    }

    // source 线段
    let S_e = this.rotatePoint(S_a, { x: S_a.x - lineWidth / 2, y: S_a.y + side }, 90 - angle)
    let S_f = this.rotatePoint(S_a, { x: S_a.x + lineWidth / 2, y: S_a.y + side }, 90 - angle)
    let S_g = this.rotatePoint(
      S_a,
      { x: S_a.x - lineWidth / 2, y: S_a.y + side + lineLength },
      90 - angle
    )
    let S_h = this.rotatePoint(
      S_a,
      { x: S_a.x + lineWidth / 2, y: S_a.y + side + lineLength },
      90 - angle
    )

    // target 箭头
    let T_a = target
    let T_b = { x: 0, y: 0 }
    let T_c = { x: 0, y: 0 }
    // 无方向的目的端无箭头
    if (T_type === '1') {
      T_b = this.rotatePoint(T_a, { x: T_a.x, y: T_a.y + side }, -angle - 90)
      T_c = this.rotatePoint(T_a, { x: T_a.x, y: T_a.y + side }, -angle - 90)
    } else if (T_type === 'N') {
      // 有方向的目的端有箭头
      T_b = this.rotatePoint(T_a, { x: T_a.x - side, y: T_a.y + side }, -angle - 90)
      T_c = this.rotatePoint(T_a, { x: T_a.x + side, y: T_a.y + side }, -angle - 90)
    }

    // target 线段
    let T_e = this.rotatePoint(T_a, { x: T_a.x - lineWidth / 2, y: T_a.y + side }, -angle - 90)
    let T_f = this.rotatePoint(T_a, { x: T_a.x + lineWidth / 2, y: T_a.y + side }, -angle - 90)
    let T_g = this.rotatePoint(
      T_a,
      { x: T_a.x - lineWidth / 2, y: T_a.y + side + lineLength },
      -angle - 90
    )
    let T_h = this.rotatePoint(
      T_a,
      { x: T_a.x + lineWidth / 2, y: T_a.y + side + lineLength },
      -angle - 90
    )
    D = `
          M ${S_a.x} ${S_a.y}
          L ${S_b.x} ${S_b.y}
          L ${S_c.x} ${S_c.y}
          Z
          M ${S_e.x} ${S_e.y}
          L ${S_f.x} ${S_f.y}
          L ${S_h.x} ${S_h.y}
          L ${S_g.x} ${S_g.y}
          Z
          M ${T_e.x} ${T_e.y}
          L ${T_f.x} ${T_f.y}
          L ${T_h.x} ${T_h.y}
          L ${T_g.x} ${T_g.y}
          Z
          M ${T_a.x} ${T_a.y}
          L ${T_b.x} ${T_b.y}
          L ${T_c.x} ${T_c.y}
          Z
        `
    return D
  }

  private getLink_text(source: Point, target: Point, linkData: LinkConfig) {
    let textHeight = linkData.textHeight / 4 || 0
    let side = this.config.arrowSize || 0
    let textGap = this.config.textGap || 0
    let angle = linkData.angle
    let lineLength =
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      side -
      textGap

    let text_Point: Point = { x: 0, y: 0 }
    let text_angle = 0

    if (angle >= 0 && angle < 90) {
      text_angle = angle
      text_Point = this.rotatePoint(
        source,
        { x: source.x - textHeight, y: source.y + side + lineLength + textGap },
        90 - angle
      )
    }
    if (angle >= 90 && angle <= 180) {
      text_angle = angle + 180
      text_Point = this.rotatePoint(
        target,
        { x: target.x - textHeight, y: target.y + side + lineLength + textGap },
        -90 - angle
      )
    }
    if (angle <= -90 && angle > -180) {
      text_angle = angle + 180
      text_Point = this.rotatePoint(
        target,
        { x: target.x - textHeight, y: target.y + side + lineLength + textGap },
        -90 - angle
      )
    }
    if (angle > -90 && angle <= 0) {
      text_angle = angle
      text_Point = this.rotatePoint(
        source,
        { x: source.x - textHeight, y: source.y + side + lineLength + textGap },
        90 - angle
      )
    }
    return `translate(${text_Point.x}, ${text_Point.y}) rotate(${text_angle})`
  }

  private getLink_length(source: Point, target: Point, linkData: LinkConfig) {
    const arrowSize = this.config.arrowSize || 4
    const textGap = this.config.textGap || 6
    return (
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      linkData.textWidth / 2 -
      arrowSize -
      textGap
    )
  }

  getContainerSize() {
    const c = this.container?.node()
    return {
      width: c?.clientWidth || 0,
      height: c?.clientHeight || 0
    }
  }
  getViewPortSize() {
    const c = this.viewport?.node()
    return {
      width: c?.clientWidth || 0,
      height: c?.clientHeight || 0
    }
  }

  private getElementSize(el: Selection<SVGGElement, any, SVGSVGElement, any>) {
    const c = el?.node()
    return {
      width: c?.clientWidth || 0,
      height: c?.clientHeight || 0
    }
  }

  public isTopoLinkData(linkData: TopoLink | TopoLink[]) {
    if (Array.isArray(linkData)) {
      return linkData.every((s) => typeof s.source === 'object' && typeof s.target === 'object')
    } else {
      return typeof linkData.source === 'object' && typeof linkData.target === 'object'
    }
  }

  public loadConfig(c?: TopoConfig) {
    c && Object.assign(this.config, c)
    this.forceCollide && this.forceCollide.radius(this.config.nodeRadius * this.config.nodeGap)
    cssVar['--node-ring-color'] = this.config.nodeRingColor
    cssVar['--bg-color'] = this.config.containerBg
    cssVar['--bg-color-stop'] = this.config.containerBgEdit
    cssVar['--node-ring-color-active'] = this.config.highlightColor
    cssVar['--node-bg-color-active'] = this.config.highlightColor
    cssVar['--link-line-color-active'] = this.config.highlightColor
    cssVar['--link-text-color-active'] = this.config.highlightColor
    cssVar['--link-line-color'] = this.config.linkColor
    cssVar['--link-width'] = this.config.linkWidth + 'px'
    cssVar['--text-size-md'] = this.config.fontSize + 'px'
    this.container && injectCssVar(this.container)
    this.simulation?.restart()
  }
}

import { deepCopy } from './tool'
import {
  forceSimulation,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  ForceLink
} from 'd3-force'
import { select, selectAll, Selection } from 'd3-selection'
import { zoom as zoomD3, zoomIdentity, D3ZoomEvent } from 'd3-zoom'
import { svg, blob } from 'd3-fetch'
import { drag as dragD3, D3DragEvent } from 'd3-drag'

// import D3 from 'd3'

// 建议关闭 ts 的 strict 模式

type ObjString = {
  [key: string]: any
}
type Point = {
  x: number
  y: number
}
type LinkConfig = {
  side: number
  lineWidth: number
  textGap: number
  lineLength: number
  textWidth: number
  textHeight: number
  angle: number
  type: string | 'N-N' | '1-N' | 'N-1' | '1-1'
}
type TopoConfig = {}

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
  tipInfo?: ObjString
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

export default class Topology {
  private el: string
  private nodes: Array<TopoNode>
  private links: Array<TopoLink>
  private config: TopoConfig
  private container: Selection<Element, any, any, any> | null
  private viewport: Selection<SVGSVGElement, any, any, any> | null
  private wrapper: Selection<SVGGElement, any, any, any> | null
  private wrapperNodes: Selection<SVGGElement, TopoNode, any, any> | null
  private wrapperLinks: Selection<SVGGElement, TopoLinkData, any, any> | null
  private simulation: Simulation<TopoNode, TopoLink> | null
  private nodeTotal: Selection<SVGGElement, TopoNode, any, any> | null
  private linkTotal: Selection<SVGGElement, TopoLink, any, any> | null
  private linkLineOut: Selection<SVGPathElement, any, any, any> | null
  private linkLineIn: Selection<SVGPathElement, any, any, any> | null
  private linkLineText: Selection<SVGTextElement, any, any, any> | null
  private radius: number
  private cbList: Map<string | symbol, Function>
  private scaleMap: any
  public selectedNodes: Array<TopoNode> | null
  public isStartTopology: boolean
  public isAddLink: boolean
  public isboxSelect: boolean
  public isHighlight: boolean
  public isZoom: boolean
  public isLocateNode: boolean
  public locateNodeId: string
  public isFixedNode: boolean
  constructor(el: string, nodes: TopoNode[] = [], links: TopoLink[] = [], config: TopoConfig = {}) {
    this.el = el
    this.nodes = nodes
    this.links = links
    this.config = config
    // 容器
    this.container = null
    // 画布
    this.viewport = null
    this.wrapper = null
    this.wrapperNodes = null
    this.wrapperLinks = null
    // 力导模型
    this.simulation = null
    // nodeTotal 整体
    this.nodeTotal = null
    // linkTotal 整体
    this.linkTotal = null
    this.linkLineOut = null
    this.linkLineIn = null
    this.linkLineText = null
    // 节点半径
    this.radius = 30
    // 被选中节点
    this.selectedNodes = []
    // 是否启动拓扑图（编辑）
    this.isStartTopology = true
    // 是否可以连线
    this.isAddLink = false
    // 是否可以框选
    this.isboxSelect = false
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
      this.appendSvg()
    }
  }

  // 初始化力导模型
  private initSimulation() {
    if (!this.viewport) {
      return
    }
    const { width, height } = this.getViewPortSize()
    this.simulation = forceSimulation<TopoNode, TopoLink>()
      .force(
        'collide',
        forceCollide()
          .radius(this.radius * 2)
          .strength(0.7)
          .iterations(1)
      )
      .force('charge', forceManyBody().distanceMin(10).distanceMax(100).strength(30))
      .force('center', forceCenter(width / 2, height / 2))
      .force(
        'link',
        forceLink<TopoNode, TopoLink>()
          .distance(100)
          .strength(0.7)
          .id((d: TopoNode) => d.id)
      )
      .on('tick', () => this.tick())
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
      .attr('class', 'topology-svg')
      .on('click', () => {
        this.callBack('right_Event_close')
      })
    this.viewport.call(this.zoomFit()).on('dblclick.zoom', null)
    // this.viewport.call(zoomD3());
    this.wrapper = this.viewport.append('g').attr('class', 'wrapper')
    this.wrapperLinks = this.wrapper.append('g').attr('class', 'wrapper-links')
    this.wrapperNodes = this.wrapper.append('g').attr('class', 'wrapper-nodes')
  }
  private appendNode() {
    if (!this.nodeTotal) return

    const _this = this
    this.nodeTotal = this.nodeTotal
      .enter()
      .append('g')
      .attr('class', 'node')
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

    const imgWidth = this.radius * 1.5
    const imgHeight = this.radius * 1.5
    this.nodeTotal
      .append('rect')
      .attr('class', 'ring')
      .attr('width', this.radius * 2)
      .attr('height', this.radius * 2)
      .attr('x', `-${this.radius}px`)
      .attr('y', `-${this.radius}px`)
    this.nodeTotal.append('circle').attr('class', 'out-line').attr('r', this.radius)
    this.nodeTotal
      .append('text')
      .attr('class', 'title')
      .attr('text-anchor', 'middle')
      .attr('y', `${this.radius + 20}px`)
      .text((d) => d.name)
    // 处理图片以及svg
    this.nodeTotal.each(function (d) {
      if (d.img) {
        const node = select<SVGGElement, TopoNode>(this)
        blob(d.img).then((res) => {
          if (['image/jpeg', 'image/jpg', 'image/png'].includes(res.type)) {
            node
              .append('image')
              .attr('style', `width: ${imgWidth}px;height: ${imgHeight}px;`)
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
                  .attr('class', 'svg-icon')
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
        const linkData = select<SVGGElement, TopoLinkData>(this).select('.link-in').datum()
        if (linkData.hasOwnProperty('tipInfo')) {
          tip = _this.appendLinkTips(x, y, linkData.tipInfo || {}) || null
        }
      })
      .on('mouseout', function (event) {
        tip && tip.remove()
      })
      .on('mouseenter', function (event) {
        const linkData = select(this).select('.link-in').datum() as TopoLinkData
        _this.highlight(this, true, linkData)
        if (!_this.isHighlight && !_this.isboxSelect) {
          select(this).attr('class', 'link active-link')
        }
      })
      .on('mouseleave', function (event) {
        _this.highlight(this, false)
        if (!_this.isHighlight && !_this.isboxSelect) {
          select(this).attr('class', 'link')
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
    function appendLinkOut() {
      return _this.linkTotal && _this.linkTotal.append('path').attr('class', 'link-out')
    }
    function appendLinkIn() {
      return _this.linkTotal && _this.linkTotal.append('path').attr('class', 'link-in')
    }
    function appendLinkArrow() {
      return _this.linkTotal && _this.linkTotal.append('path').attr('class', 'link-arrow')
    }
    function appendLinkText() {
      return (
        _this.linkTotal &&
        _this.linkTotal
          .append('text')
          .attr('class', 'link-text')
          .attr('text-anchor', 'middle')
          .text(function (d) {
            return d.name
          })
      )
    }
    return {
      linkOut: appendLinkOut(),
      linkIn: appendLinkIn(),
      linktext: appendLinkText(),
      linkArrow: appendLinkArrow()
    }
  }

  private appendLinkTips(x: number, y: number, content: ObjString) {
    if (!this.viewport) return

    const tipInfo = Object.keys(content)
    if (!tipInfo.length) return
    let tipWidth = 150
    let tipHeight = 90
    const tip = this.viewport.append('g').attr('class', 'wrapper-tip')
    tip
      .append('rect')
      .attr('class', 'tip')
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
    if (!this.wrapperNodes) {
      return
    }
    this.nodeTotal = this.wrapperNodes
      .selectAll<SVGGElement, TopoNode>('#topology .node')
      .data(this.nodes, function (d: TopoNode) {
        return d.id
      })
    this.appendNodeToGraph()
    this.nodeTotal = this.nodeTotal.merge(this.nodeTotal)
  }

  private updatedLink() {
    if (!this.wrapperLinks) return
    this.linkTotal = this.wrapperLinks
      .selectAll<SVGGElement, TopoLinkData>('#topology .link')
      .data(this.links, function (d: TopoLink) {
        return d.id
      })
    if (!this.linkTotal) {
      return
    }
    const { linkOut, linkIn, linktext } = this.appendLinkToGraph()
    this.linkTotal = this.linkTotal.merge(this.linkTotal)

    this.linkLineOut = this.wrapperLinks.selectAll('#topology .link-out')
    this.linkLineOut = linkOut && linkOut.merge(this.linkLineOut)

    this.linkLineIn = this.wrapperLinks.selectAll('#topology .link-in')
    this.linkLineIn = linkIn && linkIn.merge(this.linkLineIn)

    this.linkLineText = this.wrapperLinks.selectAll('#topology .link-text')
    this.linkLineText = linktext && linktext.merge(this.linkLineText)
  }

  public updatedNodeAndLink() {
    if (!this.simulation) {
      return
    }
    this.simulation.nodes(this.nodes)

    this.simulation
      .force<ForceLink<TopoNode, TopoLink>>('link')
      ?.links(this.links)
      .id(function id(d) {
        return d.id
      })
    this.updatedNode()
    this.updatedLink()
  }

  private tick() {
    this.tickNode()
    this.tickLink()
  }

  private tickNode() {
    if (this.nodeTotal) {
      this.nodeTotal.attr('transform', function (d) {
        return `translate(${d.x}, ${d.y})`
      })
    }
  }

  private tickLink() {
    if (this.linkTotal) {
      const _this = this
      this.linkTotal.each(function (this: SVGGElement) {
        let link = select<SVGGElement, TopoLinkData>(this)
        let link_out = link.select('.link-out')
        let link_in = link.select('.link-in')
        let link_arrow = link.select('.link-arrow')
        let link_text = link.select<SVGGElement>('.link-text')

        let source: Point = { x: 0, y: 0 }
        let target: Point = { x: 0, y: 0 }

        const config_link: LinkConfig = {
          // 箭头大小
          side: 4,
          // 线的宽度
          lineWidth: 2,
          textGap: 6,
          lineLength: 0,
          textWidth: link_text.node()?.getBBox().width || 0,
          textHeight: link_text.node()?.getBBox().height || 0,
          angle: 0,
          type: 'N-N'
        }

        if (!['1-1', '1-N', 'N-1', 'N-N'].includes(config_link.type)) {
          return console.error('link 箭头类型设置错误')
        }

        link_out.attr('d', function (d: TopoLinkData) {
          return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`
        })
        // link_arrow.attr('d', function (d) {
        //   if (d.source.id === d.target.id) {
        //     config_link.type = d.linkType
        //     config_link.angle = _this.rotation(d.source, d.target)
        //     source = _this.rotatePoint(
        //       d.source,
        //       { x: d.source.x, y: d.source.y + _this.radius + 2 },
        //       90 - config_link.angle
        //     )
        //     target = _this.rotatePoint(
        //       d.target,
        //       { x: d.target.x, y: d.target.y + _this.radius + 2 },
        //       -90 - config_link.angle
        //     )
        //     config_link.lineLength = _this.getLink_length(source, target, config_link)
        //     return _this.getLinK_D_self(d.source, d.target, config_link, true)
        //   }
        // })
        link_in.attr('d', function (d: TopoLinkData) {
          config_link.type = d.linkType
          config_link.angle = _this.rotation(
            { x: d.source.x!, y: d.source.y! },
            { x: d.target.x!, y: d.target.y! }
          )
          source = _this.rotatePoint(
            { x: d.source.x, y: d.source.y },
            { x: d.source.x, y: d.source.y! + _this.radius + 2 },
            90 - config_link.angle
          )
          target = _this.rotatePoint(
            { x: d.target.x!, y: d.target.y! },
            { x: d.target.x, y: d.target.y! + _this.radius + 2 },
            -90 - config_link.angle
          )
          config_link.lineLength = _this.getLink_length(source, target, config_link)
          // todo 以后看机会删除这段，神特么自己连自己，有毛病~
          // if (d.source.id === d.target.id) {
          //   select(this).attr('style', 'fill: transparent;')
          //   return _this.getLinK_D_self(d.source, d.target, config_link)
          // }
          return _this.getLink_D(source, target, config_link)
        })
        link_text.attr('transform', function () {
          return _this.getLink_text(source, target, config_link)
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
      _this.wrapper &&
        _this.wrapper.attr(
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
    select('.topology-svg').attr('class', 'topology-svg stop')
  }

  // 重新启动force活动
  public start() {
    this.simulation?.restart()
    this.isStartTopology = true
    this.isAddLink = false
    this.isboxSelect = false
    this.viewport?.call(this.zoomFit()).on('dblclick.zoom', null)
    select('.topology-svg').attr('class', 'topology-svg')
  }

  //  开启节点高亮显示
  public hightlight(isOpen?: boolean) {
    this.isHighlight = isOpen === undefined ? !this.isHighlight : isOpen
  }

  //  添加连线
  public addLinks(cb: Function) {
    if (this.isStartTopology) return
    this.isAddLink = true
    this.isZoom = true
    this.isboxSelect = false
    this.callBackRegister('_addLink', cb)
  }

  //  取消连线
  public addLinksCancel() {
    this.isAddLink = false
    this.isZoom = true
    selectAll('#topology .temp').remove()
    this.callBackClear('_addLink')
  }

  //  框选
  public boxSelect(cb: Function) {
    if (this.isStartTopology) return
    this.isboxSelect = true
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
    this.isboxSelect = false
    this.isZoom = true
    this.selectedNodes = []
    this.nodeTotal?.each(function () {
      select(this).attr('class', 'node')
    })
    this.linkTotal?.each(function () {
      select(this).attr('class', 'link')
    })
    this.callBackClear('_boxSelect')
    selectAll('#topology .temp').remove()
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

        if (_this.wrapperLinks) {
          linkTemp = _this.wrapperLinks
            .append('g')
            .attr('class', 'link temp')
            .append('path')
            .attr('class', 'link-in')
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
        let end = _this.simulation?.find(event.x, event.y, _this.radius)
        if (end) {
          linkTemp?.attr('d', `M ${startLink_x} ${startLink_y} L ${end.x} ${end.y}`)
          _this.callBack('_addLink', {
            source: event.subject,
            target: end,
            success: true
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
    let curNode = select(_this).datum() as TopoNode
    let id = curNode.id
    let linkId: string[] = []
    let sourceId = nodeInfo ? nodeInfo.source.id : null
    let targetId = nodeInfo ? nodeInfo.target.id : null
    let linkId1 = nodeInfo ? nodeInfo.id : null
    let flag = null
    let flag1 = null
    linkId.push(id)
    if (open) {
      selectAll<SVGGElement, TopoLinkData>('#topology .link').attr(
        'class',
        function (d: TopoLinkData) {
          // 鼠标经过线和节点时判断规则
          flag1 = linkId1 === d.id ? d.source.id === sourceId && d.target.id === targetId : false
          flag = nodeInfo ? flag1 : d.source.id === id || d.target.id === id
          if (flag) {
            linkId.push(d.source.id)
            linkId.push(d.target.id)
            return 'link active'
          } else {
            return 'link no-active'
          }
        }
      )
      selectAll<SVGGElement, TopoNode>('#topology .node').attr('class', function (d: TopoNode) {
        if (!linkId.some((v) => v === d.id)) {
          return 'node no-active'
        } else {
          if (d.id === id) {
            return 'node active'
          }
          return 'node'
        }
      })
    } else {
      selectAll('#topology .link').attr('class', 'link')
      selectAll('#topology .node').attr('class', 'node')
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
          .attr('class', 'box-selected temp')
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
      // 当前所有被圈中的节点
      // selectedNodes = _this.findNodeBySelectBox(selectedNodes, _this.selectedNodes)

      // 设置选中节点样式
      _this.nodeTotal?.each(function () {
        select<SVGGElement, TopoNode>(this).attr('class', function (d: TopoNode) {
          if (selectedNodes.some((v) => v.id === d.id)) {
            return 'node'
          } else {
            return 'node no-active'
          }
        })
      })

      // 设置选中连线样式
      _this.linkTotal?.each(function () {
        select<SVGGElement, TopoLinkData>(this).attr('class', function (d: TopoLinkData) {
          if (
            selectedNodes.some((v) => v.id === d.source.id) &&
            selectedNodes.some((v) => v.id === d.target.id)
          ) {
            return 'link active'
          } else {
            return 'link no-active'
          }
        })
      })
    }

    // 框选完毕之后执行的操作
    function dragEnd() {
      selectAll('#topology .temp').remove()
      _this.selectedNodes = selectedNodes
      _this.isZoom = false
      _this.nodeTotal?.each(function (d) {
        if (_this.selectedNodes?.find((v) => v.id === d.id)) {
          select(this).attr('pointer-events', 'visiblePoint')
        } else {
          select(this).attr('pointer-events', 'none')
        }
      })

      _this.callBack('_boxSelect', _this.selectedNodes)
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
    // for IE，这里其实就是模拟了按下键盘的F11，使浏览器全屏
    // if (typeof window.ActiveXObject != 'undefined') {
    //   let wscript = new ActiveXObject('WScript.Shell')
    //   if (wscript != null) {
    //     wscript.SendKeys('{F11}')
    //   }
    // }
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
          .attr('r', _this.radius * 1.1)
      }
    })
  }

  // 卸载拓扑图
  public unmountedTopology() {
    this.stop()
    this.el = ''
    this.nodes = []
    this.links = []
    this.config = {}
    this.container = null
    this.viewport = null
    this.wrapper = null
    this.wrapperNodes = null
    this.wrapperLinks = null
    this.simulation = null
    this.nodeTotal = null
    this.linkTotal = null
    this.linkLineOut = null
    this.linkLineIn = null
    this.linkLineText = null
    this.radius = 20
    this.selectedNodes = []
    this.isStartTopology = true
    this.isAddLink = false
    this.isboxSelect = false
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
    return this.simulation?.find(mX, mY, this.radius)
  }

  // 找到当前被选中的节点
  public findNodeBySelectBox(selected: TopoNode[], allSelected: TopoNode[]) {
    let tempList: TopoNode[] = []
    let flag = false
    selected.forEach((item1) => {
      flag = allSelected.some((item2) => item1.id === item2.id)
      if (!flag) {
        tempList.push(item1)
      }
    })
    return [...deepCopy(allSelected), ...tempList]
  }

  // 根据起始坐标来寻找节点
  public findNodesByBox(start: Point, end: Point) {
    let matrix = this.pointMapMatrix(start, end)
    let startMap = matrix.start
    let endMap = matrix.end

    return this.nodes.filter((v) => {
      if (v.x && v.y) {
        return (
          v.x >= startMap.x - this.radius &&
          v.y >= startMap.y - this.radius &&
          Math.abs(v.x - (startMap.x - this.radius)) <=
            Math.abs(endMap.x + this.radius * 2 - startMap.x) &&
          Math.abs(v.y - (startMap.y - this.radius)) <=
            Math.abs(endMap.y + this.radius * 2 - startMap.y)
        )
      }
    })
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
  public callBack<T>(name: string | symbol, ...arg: Array<T>) {
    if (this.cbList.has(name)) {
      if (this.cbList.get(name)) {
        this.cbList.get(name)?.call(this, ...arg)
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
  private getLink_D(source: Point, target: Point, config_link: LinkConfig) {
    let angle = this.rotation(source, target)
    let side = config_link.side || 0
    let lineWidth = config_link.lineWidth || 0
    let lineLength = config_link.lineLength || 0
    let D = ''
    let S_type = config_link.type[0]
    let T_type = config_link.type[2]

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
  private getLinK_D_self(source: Point, target: Point, config_link: LinkConfig, flag = false) {
    let side = config_link.side || 0
    let lineLength = config_link.lineLength || 0
    let start = this.rotatePoint(source, { x: source.x, y: source.y + this.radius }, 45)
    let end = this.rotatePoint(source, { x: source.x, y: source.y + this.radius }, 135)
    let S_b = null
    let S_c = null
    let T_b = null
    let T_c = null
    // 远端有方向和没有方向
    if (config_link.type === 'N-N') {
      S_b = this.rotatePoint(source, { x: source.x, y: source.y + this.radius + side * 1.5 }, 60)
      S_c = this.rotatePoint(source, { x: source.x, y: source.y + this.radius + side * 1.5 }, 35)
    } else {
      S_b = start
      S_c = start
    }
    // 目的端没有方向和有方向
    if (config_link.type === '1-1') {
      T_b = end
      T_c = end
    } else {
      T_b = this.rotatePoint(source, { x: source.x, y: source.y + this.radius + side * 1.5 }, 120)
      T_c = this.rotatePoint(source, { x: source.x, y: source.y + this.radius + side * 1.5 }, 145)
    }
    // 只画箭头
    let D1 = `
      M ${start.x} ${start.y}
      L ${S_b.x} ${S_b.y}
      L ${S_c.x} ${S_c.y}
      Z
      M ${end.x} ${end.y}
      L ${T_b.x} ${T_b.y}
      L ${T_c.x} ${T_c.y}
      Z
    `
    // 只画线
    let D = `
      M ${start.x} ${start.y}
      A 22 15 0 0 0  ${start.x + 40} ${start.y - this.radius / 2}
      M ${start.x + 40} ${start.y - this.radius / 2 - 10}
      A 22 15 0 0 0  ${end.x} ${end.y}
    `
    if (flag) {
      return D1
    } else {
      return D
    }
  }
  private getLink_text(source: Point, target: Point, config_link: LinkConfig) {
    let textHeight = config_link.textHeight / 4 || 0
    let side = config_link.side || 0
    let textGap = config_link.textGap || 0
    let angle = config_link.angle
    // let lineLength = config_link.lineLength || Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 - config_link.textWidth - config_link.side - config_link.textGap
    let lineLength =
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      config_link.side -
      config_link.textGap

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

  private getLink_length(source: Point, target: Point, config_link: LinkConfig) {
    return (
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      config_link.textWidth / 2 -
      config_link.side -
      config_link.textGap
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
}

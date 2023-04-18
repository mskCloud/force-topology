import { deepCopy } from './tool'
import {
  forceSimulation,
  forceRadial,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceX,
  forceY,
  Simulation,
  SimulationLinkDatum,
  SimulationNodeDatum,
  ForceLink,
} from 'd3-force'
import { select, selectAll, Selection, BaseType } from 'd3-selection'
import { zoom as zoomD3, zoomIdentity } from 'd3-zoom'
import { xml } from 'd3-fetch'
import { drag as dragD3, dragDisable, dragEnable } from 'd3-drag'
import { transition } from 'd3-transition'

interface TopoNode extends SimulationNodeDatum {
  id: string | number
  name: string
  img?: string
}
interface TopoLink extends SimulationLinkDatum<TopoNode> {
  id: string | number
  name: string
  source: TopoNode | string | number
  target: TopoNode | string | number
  sourceId: string | number
  targetId: string | number
  linkType: string
  tipInfo: Object
}

// 拓扑图生成后，source、target将自动被设置成Node的data,用此类型覆盖初始时source/target为string/number的类型
interface TopoLinkData extends TopoLink {
  source: TopoNode
  target: TopoNode
}

type TopoTipInfo = {
  sourceName?: string
  name?: string
  targetName?: string
  constraintRel?: string
  directionType?: string
}
type TopoConfig = {}

// 建议关闭 ts 的 strict 模式

export default class Topology {
  private el: string
  private nodes: Array<TopoNode>
  private links: Array<TopoLink>
  private config: TopoConfig
  private box: Selection<SVGAElement, any, any, any>
  private container: Selection<SVGAElement, any, any, any>
  private svg: Selection<SVGSVGElement, any, any, any>
  private wrapper: Selection<SVGGElement, any, any, any>
  private wrapperNodes: Selection<SVGGElement, any, any, any>
  private wrapperLinks: Selection<SVGGElement, any, any, any>
  private simulation: Simulation<TopoNode, TopoLink>
  private node: Selection<BaseType, TopoNode, any, any>
  private link: Selection<BaseType, TopoLink, any, any>
  private linkLineOut: Selection<SVGPathElement, any, any, any>
  private linkLineIn: Selection<SVGPathElement, any, any, any>
  private linkLineText: Selection<SVGTextElement, any, any, any>
  private radius: number
  public selectedNodes: Array<TopoNode>
  public isStartTopology: Boolean
  public isAddLink: Boolean
  public isboxSelect: Boolean
  public isNodeMove: Boolean
  public isHighlight: Boolean
  public isZoom: Boolean
  private cbList: Map<String, Function>
  private scaleMap: any
  public isLocateNode: Boolean
  public locateNodeId: string
  constructor(el: string, nodes: Array<TopoNode>, links: Array<TopoLink>, config: TopoConfig) {
    this.el = el
    this.nodes = nodes
    this.links = links
    this.config = config
    // 容器
    this.box = null
    this.container = null
    // 画布
    this.svg = null
    this.wrapper = null
    this.wrapperNodes = null
    this.wrapperLinks = null
    // 力导模型
    this.simulation = null
    // node 整体
    this.node = null
    // link 整体
    this.link = null
    this.linkLineOut = null
    this.linkLineIn = null
    this.linkLineText = null
    // 节点半径
    this.radius = 20
    // 被选中节点
    this.selectedNodes = []
    // 是否启动拓扑图（编辑）
    this.isStartTopology = true
    // 是否可以连线
    this.isAddLink = false
    // 是否可以框选
    this.isboxSelect = false
    // 是否可以移动节点
    this.isNodeMove = true
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
  }
  // 初始化拓扑图
  public init() {
    if (!this.el) return console.error('请设置el值')
    this.initGraph()
    if (!this.box.node()) return console.error('挂载svg节点失败')
    this.initSimulation()
    this.updatedNodeAndLink()
  }

  // 初始化画布
  private initGraph() {
    this.box = select(this.el)
    this.box.html('')
    if (this.box.node()) {
      this.appendSvg()
    }
  }

  // 初始化力导模型
  private initSimulation() {
    const _this = this
    this.simulation = forceSimulation<TopoNode, TopoLink>()
      .force(
        'collide',
        forceCollide()
          .radius(function (d) {
            return 40
          })
          .strength(1)
          .iterations(2)
      )
      .force(
        'charge',
        forceManyBody()
          .distanceMax(100)
          .strength(function () {
            return 1
          })
      )
      .force(
        'link',
        forceLink()
          .distance(100)
          .strength(1)
          .id(function (d: TopoNode) {
            return d.id
          })
      )
      .force(
        'center',
        forceCenter(
          _this.wrapper.node().parentElement.parentElement.clientWidth / 2,
          _this.wrapper.node().parentElement.parentElement.clientHeight / 2
        )
      )
      .on('tick', function () {
        _this.tick()
      })
  }

  // 核心方法
  private appendSvg() {
    const _this = this
    this.svg = this.box
      .append('svg')
      .attr('height', '100%')
      .attr('width', '100%')
      .attr('class', 'UxTopology')
      .on('click', function (event: Event) {
        if (_this.cbList.has('right_Event_close')) {
          _this.callBack('right_Event_close')
        }
      })
    this.svg.call(this.zoomFit()).on('dblclick.zoom', null)
    this.wrapper = this.svg.append('g').attr('class', 'wrapper')
    this.wrapperLinks = this.wrapper.append('g').attr('class', 'wrapper-links')
    this.wrapperNodes = this.wrapper.append('g').attr('class', 'wrapper-nodes')
  }
  private appendNode() {
    const _this = this
    this.node = this.node
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
        if (_this.cbList.has('right_Event_close')) {
          _this.callBack('right_Event_close')
        }
      })
      .on('contextmenu', function (event) {
        console.log('触发：节点右键事件')
        event.preventDefault()
      })
      .call(this.dragNode())
  }

  private appendNodeClass() {
    const _this = this
    this.node.append('rect').attr('class', 'ring')
    // .attr('r', this.radius * 1.25)
    this.node.append('circle').attr('class', 'out-line').attr('r', this.radius)
    this.node.append('image').attr('xlink:href', function (d) {
      return d.img
    })
    // 处理阴影相对 node 居中
    const rings = selectAll('#topology .ring')
    rings.each(function (this: SVGAElement) {
      let ring = select(this)
      ring.attr('x', `-${ring.node().getBBox().width / 2}px`)
      ring.attr('y', `-${ring.node().getBBox().height / 2}px`)
    })
    // 处理文字相对 node 居中
    const texts = selectAll('#topology .title')
    texts.each(function (d) {
      let text = select(this)
      // 指定文字水平居中
      text.attr('text-anchor', 'middle')
      text.attr('y', '40px')
    })
    // 处理图片居中
    const images = selectAll('#topology image')
    images.each(function (this: SVGAElement) {
      let image = select(this)
      image.attr('x', `-${image.node().getBBox().width / 2}px`)
      image.attr('y', `-${image.node().getBBox().height / 2}px`)
    })
    // todo 之后优化节点中的图片或者icon逻辑
    // 处理svg Icon居中（有svg图片时，删除image）
    this.node.each(function (d) {
      const node = select(this)
      xml(d.img).then((res) => {
        let svg = res.querySelector('svg')
        if (svg) {
          let pathList = svg.querySelectorAll('path')
          pathList.forEach((item) => {
            item.setAttribute('class', 'svg-icon')
          })
          node.select('image').remove()
          svg.setAttribute('height', '42px')
          svg.setAttribute('width', '42px')
          const icon = node.append('g').attr('class', 'svg-icon')
          icon.node().append(svg)
          node.select('title').remove()
          const ring = node.select<SVGAElement>('.ring')
          icon.attr(
            'transform',
            `translate(-${ring.node().getBBox().width / 2}, -${ring.node().getBBox().height / 2})`
          )
        }
      })
    })
  }

  private appendNodeToGraph() {
    this.appendNode()
    this.appendNodeClass()
  }

  private appendLink() {
    const _this = this
    let tip = null
    this.link = this.link
      .enter()
      .append('g')
      .attr('class', 'link')
      .on('mouseover', function (event) {
        let x = event.offsetX + 16
        let y = event.offsetY + 16
        let cur = select(this).select('.link-in').datum() as TopoTipInfo
        const content = {
          sourceName: cur.sourceName,
          targetName: cur.targetName,
          directionType: cur.directionType,
          name: cur.name,
          constraintRel: cur.constraintRel,
        }
        tip = _this.appendLinkTips(x, y, content)
      })
      .on('mouseout', function (event) {
        tip.remove()
      })
      .on('mouseenter', function (event) {
        let cur = select(this).select('.link-in').datum() as TopoLinkData
        let sourceId = cur.source.id
        let targetId = cur.target.id
        let id = cur.id
        _this.highlight(this, true, { sourceId, targetId, id })
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
        if (_this.cbList.has('right_Event_close')) {
          _this.callBack('right_Event_close')
        }
      })
      .on('contextmenu', function (event) {
        console.log('触发：links右键事件')
        event.preventDefault()
      })
  }
  private appendLinkClass() {
    const _this = this
    function appendLinkOut() {
      return _this.link.append('path').attr('class', 'link-out')
    }
    function appendLinkIn() {
      return _this.link.append('path').attr('class', 'link-in')
    }
    function appendLinkArrow() {
      return _this.link.append('path').attr('class', 'link-arrow')
    }
    function appendLinkText() {
      return _this.link
        .append('text')
        .attr('class', 'link-text')
        .attr('text-anchor', 'middle')
        .text(function (d) {
          return d.name
        })
    }

    return {
      linkOut: appendLinkOut(),
      linkIn: appendLinkIn(),
      linktext: appendLinkText(),
      linkArrow: appendLinkArrow(),
    }
  }
  // todo 提示需要封装到单独的组件里
  private appendLinkTips(x, y, content) {
    const tip = this.svg.append('g').attr('class', 'wrapper-tip')
    tip
      .append('rect')
      .attr('class', 'tip')
      .attr('width', 150)
      .attr('height', 90)
      .attr('x', x)
      .attr('y', y)
      .attr('rx', 4)
      .attr('ry', 4)
    tip
      .append('text')
      .attr('class', 'tip-text')
      .attr('x', x + 10)
      .attr('y', y + 20)
      .text(function (d) {
        return `起点名称：${content.sourceName}`
      })
    tip
      .append('text')
      .attr('class', 'tip-text')
      .attr('x', x + 10)
      .attr('y', y + 40)
      .text(function (d) {
        return `关系类型：${content.name}`
      })
    tip
      .append('text')
      .attr('class', 'tip-text')
      .attr('x', x + 10)
      .attr('y', y + 60)
      .text(function (d) {
        return `终点名称：${content.targetName}`
      })
    tip
      .append('text')
      .attr('class', 'tip-text')
      .attr('x', x + 10)
      .attr('y', y + 80)
      .text(function (d) {
        return `起点=>终点：${content.constraintRel}`
      })
    // 处理tip的宽度问题
    let tipWidth = 150
    let tipHeight = 90
    selectAll('#topology .tip-text').each(function (this: SVGTextElement) {
      let width = select(this).node().getBBox().width
      if (width > tipWidth) {
        tipWidth = width
      }
    })
    select('.tip').attr('width', tipWidth + 16)
    // 处理tip边界问题
    let svgWidth = this.svg.node().getBoundingClientRect().width
    let svgHeight = this.svg.node().getBoundingClientRect().height
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
    this.node = this.wrapperNodes
      .selectAll('#topology .node')
      .data(this.nodes, function (d: TopoNode) {
        return d.id
      })
    this.appendNodeToGraph()
    this.node = this.node.merge(this.node)
  }

  private updatedLink() {
    this.link = this.wrapperLinks
      .selectAll('#topology .link')
      .data(this.links, function (d: TopoLink) {
        if (!d) return
        return d.id
      })
    let linkEnter = this.appendLinkToGraph()
    this.link = this.link.merge(this.link)

    this.linkLineOut = this.wrapperLinks.selectAll('#topology .link-out')
    this.linkLineOut = linkEnter.linkOut.merge(this.linkLineOut)

    this.linkLineIn = this.wrapperLinks.selectAll('#topology .link-in')
    this.linkLineIn = linkEnter.linkIn.merge(this.linkLineIn)

    this.linkLineText = this.wrapperLinks.selectAll('#topology .link-text')
    this.linkLineText = linkEnter.linktext.merge(this.linkLineText)
  }

  public updatedNodeAndLink() {
    const _this = this
    this.updatedNode()
    this.updatedLink()
    this.simulation.nodes(this.nodes)
    this.simulation
      .force<ForceLink<TopoNode, TopoLink>>('link')
      .links(this.links)
      .id(function id(d) {
        return d.id
      })
    this.simulation.on('end', function () {
      let n = _this.simulation.nodes()
      _this.simulation.nodes(
        n.map((v) => {
          v.fx = v.x
          v.fy = v.y
          return v
        })
      )
      if (_this.cbList.has('force_Tick_End')) {
        _this.callBack('force_Tick_End')
      }
    })
  }

  private tick() {
    this.tickNode()
    this.tickLink()
  }

  private tickNode() {
    if (this.node) {
      this.node.attr('transform', function (d) {
        return `translate(${d.x}, ${d.y})`
      })
    }
  }

  private tickLink() {
    if (this.link) {
      const _this = this
      this.link.each(function (this: SVGGElement) {
        let link = select(this)
        let link_out = link.select('.link-out')
        let link_in = link.select('.link-in')
        let link_arrow = link.select('.link-arrow')
        let link_text = link.select<SVGGElement>('.link-text')

        let source = null
        let target = null

        const config_link = {
          // 箭头大小
          side: 2,
          // 线的宽度
          linkWidth: 2,
          textGap: 4,
          lineLength: 0,
          textWidth: link_text.node().getBBox().width,
          textHeight: link_text.node().getBBox().height,
          angle: 0,
          type: 'N-N',
        }

        if (!['1-1', '1-N', 'N-1', 'N-N'].includes(config_link.type)) {
          return console.error('link 箭头类型设置错误')
        }

        link_out.attr('d', function (d: TopoLinkData) {
          return `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`
        })
        // todo 不记得为什么有这段重复的代码，待研究
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
          config_link.angle = _this.rotation(d.source, d.target)
          source = _this.rotatePoint(
            d.source,
            { x: d.source.x, y: d.source.y + _this.radius + 2 },
            90 - config_link.angle
          )
          target = _this.rotatePoint(
            d.target,
            { x: d.target.x, y: d.target.y + _this.radius + 2 },
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
    function zoom(event) {
      if (!_this.isZoom && !flag) return

      _this.scaleMap.x = event.transform.x
      _this.scaleMap.y = event.transform.y
      _this.scaleMap.k = event.transform.k

      _this.wrapper.attr(
        'transform',
        `translate(${event.transform.x}, ${event.transform.y}) scale(${event.transform.k})`
      )
      if (_this.cbList.has('right_Event_close')) {
        _this.callBack('right_Event_close')
      }
    }
    return zoomD3().on('zoom', zoom)
  }

  /**
   * 功能方法
   */

  // 更新Topology
  public updateNodesAndLinks(nodes, links) {
    this.simulation.stop()
    nodes && (this.nodes = [].concat(nodes))
    links && (this.links = [].concat(links))
    this.node.remove()
    this.link.remove()
    this.updatedNodeAndLink()
    this.simulation.restart()
  }

  // 删除某节点
  public deleteNodesAndLinksById(id) {
    this.simulation.stop()
    if (Array.isArray(id)) {
      this.nodes = this.nodes.filter((v) => !id.some((i) => i === v.id))
      this.links = this.links.filter(
        (v: TopoLinkData) => !id.some((i) => v.source.id === i || v.target.id === i)
      )
    } else {
      this.nodes = this.nodes.filter((v) => v.id !== id)
      this.links = this.links.filter(
        (v: TopoLinkData) => !(v.source.id === id || v.target.id === id)
      )
    }
    this.node.remove()
    this.link.remove()
    this.updatedNodeAndLink()
    this.simulation.restart()
  }

  // 暂停force活动
  public stop() {
    this.simulation.stop()
    this.isStartTopology = false
    this.isNodeMove = false
    select('.UxTopology').attr('class', 'UxTopology stop')
  }
  // 重新启动force活动
  public start() {
    this.simulation.restart()
    this.isStartTopology = true
    this.isNodeMove = true
    this.isAddLink = false
    this.isboxSelect = false
    this.svg.call(this.zoomFit()).on('dblclick.zoom', null)
    select('.UxTopology').attr('class', 'UxTopology')
  }

  //  开启节点高亮显示
  public openHightlight() {
    this.isHighlight = true
  }

  public closeHightlight() {
    this.isHighlight = false
  }

  //  添加连线
  public addLinks(cb) {
    if (this.isStartTopology) return
    this.isNodeMove = false
    this.isAddLink = true
    this.isZoom = true
    this.isboxSelect = false
    this.callBackRegister('_addLink', cb)
  }

  //  取消连线
  public addLinksCancel() {
    this.isNodeMove = true
    this.isAddLink = false
    this.isZoom = true
    selectAll('#topology .temp').remove()
    this.callBackClear('_addLink')
  }

  //  框选
  public boxSelect(cb) {
    if (this.isStartTopology) return
    this.isboxSelect = true
    this.isZoom = false
    this.svg.on('.zoom', null)
    this.svg.call(this.generateBox())
    this.node.each(function (d) {
      select(this).attr('pointer-events', 'none')
    })
    this.callBackRegister('_boxSelect', cb)
  }

  //  取消框选
  public boxSelectCancel() {
    this.isboxSelect = false
    this.isZoom = true
    this.isNodeMove = true
    this.selectedNodes = []
    this.node.each(function () {
      select(this).attr('class', 'node')
    })
    this.link.each(function () {
      select(this).attr('class', 'link')
    })
    this.callBackClear('_boxSelect')
    selectAll('#topology .temp').remove()
    this.svg.on('.drag', null)
    this.svg.call(this.zoomFit())
    this.node.each(function (d) {
      select(this).attr('pointer-events', 'visiblePoint')
    })
  }

  // 节点拖拽、连线
  // todo 需要解决：当多节点拖拽时，节点同步移动不一致问题
  private dragNode() {
    const _this = this
    // 连线
    let linkTemp = null
    let startLink_x = 0
    let startLink_y = 0
    // 多节点移动
    let start_x = 0
    let start_y = 0
    let rel_x = 0
    let rel_y = 0
    let speed = 2.2

    if (_this.cbList.has('right_Event_close')) {
      _this.callBack('right_Event_close')
    }

    function dragStart(event) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (!event.active) _this.simulation.alphaTarget(0.3).restart()
        if (_this.selectedNodes.length) {
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
        linkTemp = _this.wrapperLinks
          .append('g')
          .attr('class', 'link temp')
          .append('path')
          .attr('class', 'link-in')
        startLink_x = event.subject.x
        startLink_y = event.subject.y
      }
    }
    function drag(event) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (_this.selectedNodes.length) {
          multipleDrag(event)
          return
        }
        event.subject.fx = event.x
        event.subject.fy = event.y
      }
      // 添加连线
      if (_this.isAddLink) {
        linkTemp.attr('d', `M ${startLink_x} ${startLink_y} L ${event.x} ${event.y}`)
      }
    }
    function dragEnd(event) {
      // 拖拽节点
      if (!_this.isAddLink) {
        if (!event.active) _this.simulation.alphaTarget(0)
        // 固定节点
        // event.subject.fx = null;
        // event.subject.fy = null;
      }
      // 添加连线
      if (_this.isAddLink) {
        let end = _this.simulation.find(event.x, event.y, _this.radius)
        if (end) {
          linkTemp.attr('d', `M ${startLink_x} ${startLink_y} L ${end.x} ${end.y}`)
          if (_this.cbList.has('_addLink')) {
            _this.callBack('_addLink', {
              source: event.subject,
              target: end,
              success: true,
            })
          }
        } else {
          linkTemp.remove()
        }
      }
    }
    // 多节点拖拽
    function multipleDrag(event) {
      if (!_this.selectedNodes.some((v) => v.id === event.subject.id)) {
        return
      }
      rel_x = event.x - start_x
      rel_y = event.y - start_y
      start_x = event.x
      start_y = event.y
      _this.node.each(function (d) {
        if (_this.selectedNodes.some((v) => v.id === d.id)) {
          d.fx = d.x + rel_x * speed
          d.fy = d.y + rel_y * speed
        }
      })
    }
    return dragD3().on('start', dragStart).on('drag', drag).on('end', dragEnd)
  }

  // 节点高亮
  private highlight(_this, open, nodeInfo = null) {
    if (!this.isHighlight) {
      return
    }
    let curNode = select(_this).datum() as TopoNode
    let id = curNode.id
    let linkId = []
    let sourceId = nodeInfo ? nodeInfo.sourceId : null
    let targetId = nodeInfo ? nodeInfo.targetId : null
    let linkId1 = nodeInfo ? nodeInfo.id : null
    let flag = null
    let flag1 = null
    linkId.push(id)
    if (open) {
      selectAll('#topology .link').attr('class', function (d: TopoLinkData) {
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
      })
      selectAll('#topology .node').attr('class', function (d: TopoNode) {
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
    let box = null
    let boxWidth = 0
    let boxHeight = 0
    let start_x = 0
    let start_y = 0
    let findStart = { x: 0, y: 0 }
    let findEnd = { x: 0, y: 0 }
    let selectedNodes = []
    // 开始框选时计算框选盒子的起点坐标及样式
    function dragStart(event) {
      start_x = event.x
      start_y = event.y
      box = _this.svg
        .append('path')
        .attr('class', 'box-selected temp')
        .attr('fill', 'transparent')
        .attr('stroke', '#000')
        .attr('stroke-dasharray', '5,5')
    }
    // 计算框选的框子的长宽
    function drag(event) {
      boxWidth = Math.abs(event.x - start_x)
      boxHeight = Math.abs(event.y - start_y)

      if (event.x >= start_x && event.y >= start_y) {
        box.attr('d', function (d) {
          return `M ${start_x} ${start_y} h ${boxWidth} v ${boxHeight} h -${boxWidth} Z`
        })
        findStart.x = start_x
        findStart.y = start_y
        findEnd.x = start_x + boxWidth
        findEnd.y = start_y + boxHeight
      }
      if (event.x > start_x && event.y < start_y) {
        box.attr('d', function (d) {
          return `M ${start_x} ${start_y} h ${boxWidth} v -${boxHeight} h -${boxWidth} Z`
        })
        findStart.x = start_x
        findStart.y = start_y - boxHeight
        findEnd.x = start_x + boxWidth
        findEnd.y = start_y
      }

      if (event.x < start_x && event.y > start_y) {
        box.attr('d', function (d) {
          return `M ${start_x} ${start_y} h -${boxWidth} v ${boxHeight} h ${boxWidth} Z`
        })
        findStart.x = start_x - boxWidth
        findStart.y = start_y
        findEnd.x = start_x
        findEnd.y = start_y + boxHeight
      }

      if (event.x < start_x && event.y < start_y) {
        box.attr('d', function (d) {
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
      _this.node.each(function () {
        select(this).attr('class', function (d: TopoNode) {
          if (selectedNodes.some((v) => v.id === d.id)) {
            return 'node'
          } else {
            return 'node no-active'
          }
        })
      })

      // 设置选中连线样式
      _this.link.each(function () {
        select(this).attr('class', function (d: TopoLinkData) {
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
    function dragEnd(event) {
      selectAll('#topology .temp').remove()
      _this.selectedNodes = selectedNodes
      _this.isZoom = false
      _this.node.each(function (d) {
        if (_this.selectedNodes.find((v) => v.id === d.id)) {
          select(this).attr('pointer-events', 'visiblePoint')
        } else {
          select(this).attr('pointer-events', 'none')
        }
      })

      if (_this.cbList.has('_boxSelect')) {
        _this.callBack('_boxSelect', _this.selectedNodes)
      }
    }
    return dragD3().on('start', dragStart).on('drag', drag).on('end', dragEnd)
  }

  //  全屏
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
  public locateToNodeById(d) {
    const boxWidth = this.box.node().clientWidth
    const boxHeight = this.box.node().clientHeight
    this.svg
      .transition()
      .duration(500)
      .call(
        this.zoomFit(true).transform,
        zoomIdentity.scale(1).translate(boxWidth / 2 - d.x, boxHeight / 2 - d.y)
      )
  }

  // 设置当前配置项高亮
  public setNodeHeightLightById(nodeId) {
    if (nodeId) {
      const _this = this
      // 为避免性能问题，所以把取元素属性的变量放循环的外面了(避免触发同步布局事件)
      this.node.each(function (d) {
        if (d.id === nodeId) {
          if (_this.isLocateNode) {
            // _this.locateNode(d)
            _this.isLocateNode = false
          }
          select(this)
            .attr('class', 'node active')
            .select('circle')
            .attr('r', _this.radius * 1.1)
        }
      })
    }
  }

  /**
   * 工具类方法
   */

  // 根据x，y坐标来寻找节点
  public findNodeByPoint(x, y) {
    let mX = this.pointMapSpot(x, y).x
    let mY = this.pointMapSpot(x, y).y
    return this.simulation.find(mX, mY, this.radius)
  }

  // 找到当前被选中的节点
  public findNodeBySelectBox(selected, allSelected) {
    let tempList = []
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
  public findNodesByBox(start, end) {
    let matrix = this.pointMapMatrix(start, end)
    let startMap = matrix.start
    let endMap = matrix.end

    return this.nodes.filter((v) => {
      return (
        v.x >= startMap.x - this.radius &&
        v.y >= startMap.y - this.radius &&
        Math.abs(v.x - (startMap.x - this.radius)) <=
          Math.abs(endMap.x + this.radius * 2 - startMap.x) &&
        Math.abs(v.y - (startMap.y - this.radius)) <=
          Math.abs(endMap.y + this.radius * 2 - startMap.y)
      )
    })
  }

  // 坐标映射-点
  private pointMapSpot(x, y) {
    // 平移计算
    let mX = x - this.scaleMap.x
    let mY = y - this.scaleMap.y

    // 缩放计算
    mX = mX / this.scaleMap.k
    mY = mY / this.scaleMap.k

    return { x: mX, y: mY }
  }
  // 坐标映射-矩阵
  private pointMapMatrix(start, end) {
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

  //  回调函数
  public callBack(name, ...arg) {
    if (this.cbList.has(name)) {
      if (this.cbList.get(name)) {
        this.cbList.get(name).call(this, ...arg)
      } else {
        console.error(`${name}: 没有对应的回调函数`)
      }
    }
  }
  /**
   *  注册回调函数
   *
   * 注册右键事件时，请用right_Event命名
   * */
  public callBackRegister(name, cb) {
    this.cbList.set(name, cb)
  }
  //  清除回调函数
  public callBackClear(name) {
    if (name) {
      this.cbList.delete(name)
      return
    } else {
      this.cbList.clear()
      return
    }
  }
  private rotation(source, target) {
    return (Math.atan2(target.y - source.y, target.x - source.x) * 180) / Math.PI
  }
  private rotatePoint(c, p, angle) {
    return this.rotate(c.x, c.y, p.x, p.y, angle)
  }
  private rotate(cx, cy, x, y, angle) {
    let radians = (Math.PI / 180) * angle
    let cos = Math.cos(radians)
    let sin = Math.sin(radians)
    let nx = cos * (x - cx) + sin * (y - cy) + cx
    let ny = cos * (y - cy) - sin * (x - cx) + cy
    return { x: nx, y: ny }
  }
  private getLink_D(source, target, config_link) {
    let angle = this.rotation(source, target)
    let side = config_link.side || 0
    let lineWidth = config_link.lineWidth || 0
    let lineLength = config_link.lineLength || 0
    let D = ''
    let S_type = config_link.type[0]
    let T_type = config_link.type[2]

    // source 箭头
    let S_a = source
    let S_b = null
    let S_c = null
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
    let T_b = null
    let T_c = null
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
  private getLinK_D_self(source, target, config_link, flag = false) {
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
  private getLink_text(source, target, config_link) {
    let textHeight = config_link.textHeight / 4 || 0
    let side = config_link.side || 0
    let textGap = config_link.textGap || 0
    let angle = config_link.angle
    // let lineLength = config_link.lineLength || Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 - config_link.textWidth - config_link.side - config_link.textGap
    let lineLength =
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      config_link.side -
      config_link.textGap

    let text_Point = null
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

  private getLink_length(source, target, config_link) {
    return (
      Math.sqrt(Math.pow(source.x - target.x, 2) + Math.pow(source.y - target.y, 2)) / 2 -
      config_link.textWidth / 2 -
      config_link.side -
      config_link.textGap
    )
  }
}

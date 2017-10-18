const d3 = require('d3')
const debounce = require('debounce')
const d3SaveSvg = require('d3-save-svg')
const createCachedCloner = require('./createCachedCloner')
const cachedClone = createCachedCloner()

module.exports = createGraphViz

function createGraphViz({ container, maxNodeCount = Math.Infinity }) {

  const styleContent = `
  #links line {
    stroke: #999;
    stroke-opacity: 0.6;
  }

  defs marker {
    stroke: #999;
    stroke-opacity: 0.6;
  }

  #nodes circle {
    stroke: #fff;
    stroke-width: 1.5px;
  }
  `
  const styleEl = document.createElement('style')
  styleEl.appendChild(document.createTextNode(styleContent))
  document.head.appendChild(styleEl)

  const clearButton = document.createElement('button')
  clearButton.innerText = 'clear'
  clearButton.addEventListener('click', updateAfter(resetGraph))
  container.appendChild(clearButton)

  const downloadButton = document.createElement('button')
  downloadButton.innerText = 'download'
  downloadButton.addEventListener('click', downloadSvg)
  container.appendChild(downloadButton)

  const graph = { nodes: [], links: [] }

  const width = 900
  const height = 600

  var svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  // ensures links sit beneath nodes
  svg.append('g').attr('id', 'links')
  svg.append('g').attr('id', 'nodes')

  // Arrow head
  svg.append('defs')
    .append('marker')
      .attr('id', 'arrowHead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', -1.5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
    .append('path')
      .attr('d', 'M0,-5L10,0L0,5')


  var color = d3.scaleOrdinal(d3.schemeCategory20)

  var simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(15).strength(1))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('border-x', d3.forceX(width / 2).strength(0.15))
      .force('border-y', d3.forceY(height / 2).strength(0.15))
      .on('tick', updateViewPositions)
  simulation.stop()

  // graph svg parts
  let linkComponent
  let nodeComponent

  const update = debounce(updateViewGraph, 100)
  updateViewGraph()


  return {
    // plumbing
    graph,
    simulation,
    update,
    // porcelain
    addNode: updateAfter(addNode),
    addLink: updateAfter(addLink),
    removeNode: updateAfter(removeNode),
    removeNodeById: updateAfter(removeNodeById),
    resetGraph: updateAfter(resetGraph),
  }

  // helper for calling appending an update to functions
  function updateAfter(fn) {
    return function updateAfterWrapper() {
      fn.apply(null, arguments)
      update()
    }
  }

  function resetGraph () {
    graph.nodes = []
    graph.links = []
  }

  function addNode(node) {
    const alreadyHasNode = graph.nodes.some(d => d.id === node.id)
    if (alreadyHasNode) return
    graph.nodes.push(node)
    // pre-cachedClone here to set the initial position
    // modified copy will be retreived in updateGraph
    const nodeCopy = cachedClone(node)
    nodeCopy.x = width/2
    nodeCopy.y = height/2
   // kick out old nodes if over limit
   if (graph.nodes.length > maxNodeCount) {
     removeNode(graph.nodes[0])
   }
  }

  function removeNode(node) {
    const id = node.id
    // remove node from graph
    removeFromArray(node, graph.nodes)
    // remove associated links from graph
    const links = graph.links.filter(link => link.source === id || link.target === id)
    links.forEach((link) => removeFromArray(link, graph.links))
  }

  function removeNodeById(id) {
    const node = graph.nodes.find(node => node.id === id)
    if (!node) return
    removeNode(node)
  }

  function addLink(link) {
    const alreadyHasLink = graph.links.some(d => d.source === link.source && d.target === link.target)
    if (alreadyHasLink) return
    const hasSource = graph.nodes.some(d => d.id === link.source)
    if (!hasSource) return
    const hasTarget = graph.nodes.some(d => d.id === link.target)
    if (!hasTarget) return
    // add to graph
    graph.links.push(link)
    // pre-cachedClone here to set the initial position
    // modified copy will be retreived in updateGraph
    const linkCopy = cachedClone(link)
    linkCopy.id = idForLink(link)
  }

  function updateViewGraph(){
    const viewGraph = {
      nodes: graph.nodes.map(cachedClone),
      links: graph.links.map(cachedClone),
    }

    //adds newest branch and draws it
    linkComponent = svg.select('#links').selectAll('.link')
      .data(viewGraph.links, d => d.id)
    // exit
    linkComponent.exit().remove()
    // enter + update
    linkComponent = linkComponent.enter()
      .insert('line')
      .merge(linkComponent)
      .attr('id',d => d.id)
      .attr('class', d => `link link_${d.source.codec}_${d.target.codec}`)
      .attr('marker-end', `url(#arrowHead)`)

    //adds newest leaf
    nodeComponent = svg.select('#nodes').selectAll('.node')
      .data(viewGraph.nodes, d => d.id)
    // exit
    nodeComponent.exit().remove()
    // enter and update
    nodeComponent= nodeComponent.enter()
      .insert('g').insert('circle')
      .merge(nodeComponent)
      .attr('id',d => d.id)
      .attr('class', d => `node node_${d.codec}`)
      .attr('r', 5)
      .attr('fill', d => color(d.group))
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // update simulation
    simulation.stop()
    simulation.nodes(viewGraph.nodes)
    simulation.force('link').links(viewGraph.links)
    simulation.alpha(1).restart()
    updateViewPositions()
  }

  function updateViewPositions() {
    linkComponent
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    nodeComponent
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }

  function downloadSvg() {
    const svgCopy = svg.node().cloneNode(true)
    // need to insert into the dom for d3SaveSvg to work
    container.appendChild(svgCopy)
    d3SaveSvg.save(svgCopy, {
      filename: 'ethereum-state-graph',
    })
    svgCopy.remove()
  }

}

function removeFromArray(item, array) {
  const index = array.indexOf(item)
  array.splice(index, 1)
}

// handles both types of links:
// { source: id }, { source: { id } }
function idForLink(link) {
  const source = link.source.id || link.source
  const target = link.target.id || link.target
  if (!source || !target) debugger
  return `${source}_${target}`
}
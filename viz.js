const d3 = require('d3')
const debounce = require('debounce')
const clone = require('lodash.clonedeep')
const createLazyArrayCloner = require('./createLazyArrayCloner')
const lazyClone = createLazyArrayCloner()

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

  const buttonEl = document.createElement('button')
  buttonEl.innerText = 'clear'
  buttonEl.addEventListener('click', resetGraph)
  container.appendChild(buttonEl)

  const graph = { nodes: [], links: [] }
  const maps = { nodes: {}, links: {} }

  const width = 900
  const height = 600

  var svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

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


  var color = d3.scaleOrdinal(d3.schemeCategory20);

  var simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(d => d.id).distance(15).strength(1))
      .force('charge', d3.forceManyBody())
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('border-x', d3.forceX())
      .force('border-y', d3.forceY())
      .on('tick', ticked)
  simulation.stop()

  const update = debounce(updateGraph, 20)

  // graph svg parts
  let linkComponent
  let nodeComponent

  updateGraph()


  return { simulation, graph, maps, update, addNode, removeNode, addLink, removeLink, resetGraph }

  function resetGraph () {
    graph.nodes = []
    graph.links = []
    maps.nodes = {}
    maps.links = {}
    update()
  }

  function addNode(node) {
    _addNode(node)
    update()
  }

  function _addNode(node) {
    // node.x = width/2
    // node.y = height/2
    graph.nodes.push(node)
    maps.nodes[node.id] = node
    // // kick out old nodes if over limit
    // if (graph.nodes.length > maxNodeCount) {
    //   _removeNode(graph.nodes[0])
    // }
  }

  function removeNode(node) {
    _removeNode(node)
    update()
  }

  function _removeNode(node) {
    const id = node.id
    const links = maps.links[id] || []
    // remove node from maps
    delete maps.nodes[id]
    // remove node from graph
    const index = graph.nodes.indexOf(node)
    graph.nodes.splice(index, 1)
    // remove links
    // dont mutate array while iterating (!)
    links.slice().forEach(_removeLink)
  }

  function _removeNodeById(id) {
    const node = maps.nodes[id]
    if (!node) return
    _removeNode(node)
  }

  function addLink(link) {
    _addLink(link)
    update()
  }

  function _addLink(link) {
    // add link to graphs
    graph.links.push(link)
    // add link to maps
    // initialize array if missing
    const sourceList = maps.links[link.source] = maps.links[link.source] || []
    const targetList = maps.links[link.target] = maps.links[link.target] || []
    sourceList.push(link)
    targetList.push(link)
  }

  function removeLink(link) {
    _removeLink(link)
    update()
  }

  function _removeLink(link) {
    // remove from graph
    const index = graph.links.indexOf(link)
    if (index < 0) debugger
    const countBefore = graph.links.length
    graph.links.splice(index, 1)
    const countAfter = graph.links.length

    // remove from maps
    const sourceLinks = maps.links[link.source]
    const sourceIndex = sourceLinks.indexOf(link)
    sourceLinks.splice(sourceIndex, 1)
    // garbage collect node
    if (!sourceLinks.length) {
      _removeNodeById(link.source)
      delete maps.links[link.source]
    }

    const targetLinks = maps.links[link.target]
    const targetIndex = targetLinks.indexOf(link)
    targetLinks.splice(targetIndex, 1)
    // garbage collect node
    if (!targetLinks.length) {
      _removeNodeById(link.target)
      delete maps.links[link.target]
    }
  }

  function createGraphCopy() {
    return { nodes: graph.nodes, links: lazyClone(graph.links) }
  }

  function updateGraph(){
    // force.initialize is mutating the links objects
    // const graphCopy = createGraphCopy()
    const graphCopy = graph

    // // if (graphCopy.nodes.length) debugger
    //
    // //adds newest branch and draws it
    // linkComponent = svg.select('#links').selectAll('.link')
    //   .data(graphCopy.links, d => `${d.source},${d.target}`)
    // // exit
    // linkComponent.exit().remove()
    // // enter + update
    // linkComponent.enter()
    //   .insert('line')
    //   .merge(linkComponent)
    //   .attr('class','link')
    //   .attr('marker-end', `url(#arrowHead)`)
    //
    // //adds newest leaf
    // nodeComponent = svg.select('#nodes').selectAll('.node')
    //   .data(graphCopy.nodes, d => d.id)
    // // exit
    // nodeComponent.exit().remove()
    // // enter and update
    // nodeComponent.enter()
    //   .insert('g').insert('circle')
    //   .merge(nodeComponent)
    //   .attr('class','node')
    //   .attr('r', 5)
    //   .attr('fill', d => color(d.group))
    //   .call(d3.drag()
    //     .on('start', dragstarted)
    //     .on('drag', dragged)
    //     .on('end', dragended))
    //
    // simulation.stop()
    // simulation.nodes(graphCopy.nodes)
    // simulation.force('link').links(graphCopy.links)
    // simulation.alpha(1).restart()

    //adds newest branch and draws it
    linkComponent = svg.select('#links')
      .selectAll('.link')
      .data(graph.links)
    var linkEnter = linkComponent
      .enter().append('line')
        .attr('class','link')
        .attr('marker-end', `url(#arrowHead)`)
    linkComponent = linkEnter.merge(linkComponent);

    //adds newest leaf
    nodeComponent = svg.select('#nodes')
      .selectAll('.node')
      .data(graph.nodes)
    var nodeEnter = nodeComponent
      .enter().append('g')
      .append('circle')
          .attr('class','node')
          .attr('r', 5)
          .attr('fill', d => color(d.group))
          .call(d3.drag()
              .on('start', dragstarted)
              .on('drag', dragged)
              .on('end', dragended));

    nodeComponent = nodeEnter.merge(nodeComponent);

    simulation.stop();
    simulation.force('link')
      .links(graph.links);
    simulation.nodes(graph.nodes);

    const links = simulation.force('link').links()
    if (links.some(l => typeof l.source !== 'object')) debugger

    // restart simulation
    simulation.alpha(1);
    simulation.restart();
  }


  function ticked() {
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
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

}

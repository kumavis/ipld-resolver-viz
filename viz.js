const d3 = require('d3')

module.exports = createGraphViz

function createGraphViz({ container }) {

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
      .on('tick', ticked);
  simulation.stop()

  // graph svg parts
  let linkComponent
  let nodeComponent

  update()


  return { update, simulation, graph, addNode, addLink, resetGraph }

  function resetGraph () {
    graph.nodes = []
    graph.links = []
    update()
  }

  function addNode(node) {
    node.x = width/2
    node.y = height/2
    graph.nodes.push(node)
    update()
  }

  function addLink(link) {
    graph.links.push(link)
    update()
  }

  function update(){

    const renderGraph = graph

    //adds newest branch and draws it
    linkComponent = svg.select('#links').selectAll('.link')
      .data(renderGraph.links)
    // exit
    linkComponent.exit().remove()
    // enter + update
    linkComponent.enter()
      .insert('line')
      .merge(linkComponent)
      .attr('class','link')
      .attr('marker-end', `url(#arrowHead)`)

    //adds newest leaf
    nodeComponent = svg.select('#nodes').selectAll('.node')
      .data(renderGraph.nodes, d => d.id)
    // exit
    nodeComponent.exit().remove()
    // enter and update
    nodeComponent.enter()
      .insert('g').insert('circle')
      .merge(nodeComponent)
      .attr('class','node')
      .attr('r', 5)
      .attr('fill', d => color(d.group))
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    // update simulation
    simulation.stop();
    simulation.nodes(renderGraph.nodes);
    simulation.alpha(1).restart();
    simulation.force('link').links(renderGraph.links);
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
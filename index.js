const asyncMap = require('async/map')
const CID = require('cids')
const createGraphViz = require('./viz')
const nodeTypes = {
  'eth-block': 1,
  'eth-block-list': 2,
  'eth-state-trie': 3,
  'eth-storage-trie': 4,
  'eth-tx-trie': 5,
  'eth-tx': 6,
  'raw': 7,
  'base2': 7,
}
module.exports = createResolverGraphViz

function createResolverGraphViz({ ipfs, container }) {
  const ipldResolver = ipfs._ipldResolver
  if (!ipldResolver.events) return console.warn('ipld resolver does not support events')
  const viz = createGraphViz({ container })
  // add node
  ipldResolver.events.on('node:before', addNode)
  ipldResolver.events.on('node:resolved', addNodeLinks)
  // add link
  ipldResolver.events.on('edge', addLink)

  return viz

  function addNode(cid){
    const cidString = cid.toBaseEncodedString()
    if (lookupNode(viz.graph, cidString)) return
    const group = nodeTypes[cid.codec] || 0
    viz.addNode({
      id: cidString,
      group,
    })
  }

  function addNodeLinks(cid) {
    const format = ipldResolver.resolvers[cid.codec]
    if (!format) {
      return console.warn(`addNodeLinks - no resolver for codec "${cid.codec}"`)
    }
    ipldResolver.bs.get(cid, (err, block) => {
      if (err) return console.error(err)
      format.resolver.tree(block, {}, (err, childPaths) => {
        if (err) return console.error(err)
        asyncMap(childPaths, (path, cb) => format.resolver.resolve(block, path, cb), (err, children) => {
          if (err) return console.error(err)
          children
          .map(child => child.value && child.value['/'])
          .filter(Boolean)
          .map(cidString => new CID(cidString))
          .forEach((childCid) => {
            addNode(childCid)
            addLink({ from: cid, to: childCid })
          })
        })
      })
    })
  }

  function addLink({ from, to, label }) {
    const fromCidString = from.toBaseEncodedString()
    const toCidString = to.toBaseEncodedString()
    if (!lookupNode(viz.graph, fromCidString)) addNode(from)
    if (!lookupNode(viz.graph, toCidString)) addNode(to)
    viz.addLink({
      source: fromCidString,
      target: toCidString,
      label,
    })
  }
}

function lookupNode(graph, id) {
  return graph.nodes.find(node => node.id === id)
}
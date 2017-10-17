const clone = require('lodash.clonedeep')


module.exports = createCachedCloner

function createCachedCloner() {
  const copyCache = new WeakMap()
  return function cachedClone(source) {
    let copy = copyCache.get(source)
    if (!copy) {
       copy = clone(source)
       copyCache.set(source, copy)
    }
    return copy
  }
}
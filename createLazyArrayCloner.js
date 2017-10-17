const clone = require('lodash.clonedeep')


module.exports = createLazyArrayCloner

function createLazyArrayCloner() {
  const copyCache = new WeakMap()
  return function lazyClone(source) {
    return source.map((item) => {
      let copy = copyCache.get(item)
      if (!copy) {
         copy = clone(item)
         copyCache.set(item, copy)
      }
      return copy
    })
  }
}
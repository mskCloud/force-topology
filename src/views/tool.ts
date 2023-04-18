export const deepCopy = function (source: any): any {
  return Array.isArray(source)
    ? source.map(function (item) {
        return deepCopy(item)
      })
    : source instanceof Date
    ? new Date(source.getTime())
    : source && typeof source === 'object'
    ? Object.getOwnPropertyNames(source).reduce(function (o, prop) {
        let descriptor = Object.getOwnPropertyDescriptor(source, prop)
        if (descriptor) {
          Object.defineProperty(o, prop, descriptor)
          if (source && typeof source === 'object') {
            o[prop] = deepCopy(source[prop])
          }
        }
        return o
      }, Object.create(Object.getPrototypeOf(source)))
    : source
}

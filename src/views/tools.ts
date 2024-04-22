export function debounced(fn: () => void, wait: number = 300) {
  let timer: number | null = null
  return function () {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn()
    }, wait)
  }
}

// 测试环境的最小 localStorage 实现
// 说明：storage 层只依赖 localStorage 与 crypto.randomUUID，
// 无需为此引入 jsdom（其传递依赖还要求 Node >= 20.19）。

function createMemoryStorage() {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear() {
      map.clear()
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null
    },
    removeItem(key: string) {
      map.delete(key)
    },
    setItem(key: string, value: string) {
      map.set(key, String(value))
    },
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: createMemoryStorage(),
  writable: true,
  configurable: true,
})

// happy-dom 未实现 confirm / alert。
// 注意组件里写的是裸调用 confirm(...)，它绑定在 globalThis 上，
// 所以这里也必须定义在 globalThis，测试才能替换它。
Object.defineProperty(globalThis, 'confirm', {
  value: () => true,
  writable: true,
  configurable: true,
})

Object.defineProperty(globalThis, 'alert', {
  value: () => {},
  writable: true,
  configurable: true,
})

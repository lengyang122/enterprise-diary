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

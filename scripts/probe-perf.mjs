// 性能探针：量化「卡顿」到底来自哪一层
//
// 背景在动 → 8 个 backdrop-filter 卡片的背景每帧都在变 → 必须每帧重算。
// 这正是当初 SVG 折射滤镜慢 5.7 倍的那个机制，所以每次动背景都要在这里量一次。
//
// 历史记录：折射滤镜时代是 39.6ms / 179 帧卡顿；移除后降到 6.9ms / 0 帧。
import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

// A 现状 / B 关掉光斑动画 / C 再关掉玻璃模糊 —— 用差值定位成本来源
const CONFIGS = [
  { key: 'A', label: '现状（光斑呼吸动画）', css: '' },
  {
    key: 'B',
    label: '关掉光斑动画（静态背景）',
    css: `.glass-mesh i { animation: none !important; }`,
  },
  {
    key: 'C',
    label: '静态背景 + 关掉玻璃模糊',
    css: `.glass-mesh i { animation: none !important; }
          .glass { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }`,
  },
]

const server = http.createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const file = path.join(DIST, p === '/' ? '/index.html' : p)
    const data = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(await readFile(path.join(DIST, 'index.html')))
  }
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const base = `http://127.0.0.1:${server.address().port}`

const browser = await chromium.launch({ executablePath: EDGE })

console.log('采样 180 帧（约 3 秒）。帧耗时 >32ms 记一次卡顿。\n')
console.log('配置'.padEnd(32) + '平均'.padEnd(10) + 'P95'.padEnd(10) + '最差'.padEnd(10) + '卡顿帧  长任务')

for (const cfg of CONFIGS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      localStorage.setItem('enterprise-diary-entered', '1')
    } catch {
      /* ignore */
    }
  })
  await page.goto(base + '/', { waitUntil: 'load' })
  await page.waitForTimeout(800)
  if (cfg.css) {
    await page.addStyleTag({ content: cfg.css })
    await page.waitForTimeout(400)
  }

  const res = await page.evaluate(async () => {
    let longTaskMs = 0
    let longTaskCount = 0
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) {
        longTaskMs += e.duration
        longTaskCount++
      }
    })
    try {
      po.observe({ entryTypes: ['longtask'] })
    } catch {
      /* ignore */
    }

    const deltas = []
    await new Promise(resolve => {
      let last = performance.now()
      function tick(t) {
        deltas.push(t - last)
        last = t
        if (deltas.length < 180) requestAnimationFrame(tick)
        else resolve()
      }
      requestAnimationFrame(tick)
    })
    po.disconnect()

    const sorted = [...deltas].sort((a, b) => a - b)
    return {
      avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      max: sorted[sorted.length - 1],
      jank: deltas.filter(d => d > 32).length,
      longTaskMs: Math.round(longTaskMs),
      longTaskCount,
    }
  })

  const f = n => n.toFixed(1) + 'ms'
  console.log(
    cfg.label.padEnd(28) + f(res.avg).padEnd(10) + f(res.p95).padEnd(10) + f(res.max).padEnd(10) +
      String(res.jank).padEnd(8) + `${res.longTaskCount} 次 / ${res.longTaskMs}ms`
  )

  await ctx.close()
}

await browser.close()
server.close()

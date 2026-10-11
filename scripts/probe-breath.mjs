// 临时探针：确认进入页光斑的呼吸动画真的在跑，且没有性能回退
import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
await page.goto(base + '/welcome', { waitUntil: 'load' })
await page.waitForTimeout(900)

const sample = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.glass-mesh i')].map(el => {
      const s = getComputedStyle(el)
      return { op: Number(s.opacity).toFixed(3), tr: s.transform }
    })
  )

console.log('=== 光斑随时间的状态（0s / 1.5s / 3s / 4.5s）===')
let prev = null
let changed = 0
for (let i = 0; i < 4; i++) {
  const s = await sample()
  const line = s.map((b, idx) => `#${idx + 1} op=${b.op}`).join('   ')
  console.log('  t=' + (i * 1.5).toFixed(1) + 's  ' + line)
  if (prev) {
    for (let k = 0; k < s.length; k++) {
      if (s[k].op !== prev[k].op || s[k].tr !== prev[k].tr) changed++
    }
  }
  prev = s
  if (i < 3) await page.waitForTimeout(1500)
}

// 帧耗时：确认呼吸动画没有带来性能回退（我们刚因 SVG 滤镜踩过 5.7 倍的坑）
const frames = await page.evaluate(
  () =>
    new Promise(resolve => {
      const d = []
      let last = performance.now()
      function tick(t) {
        d.push(t - last)
        last = t
        if (d.length < 180) requestAnimationFrame(tick)
        else resolve(d)
      }
      requestAnimationFrame(tick)
    })
)

const avg = frames.reduce((a, b) => a + b, 0) / frames.length
const sorted = [...frames].sort((a, b) => a - b)
console.log('\n=== 帧耗时（180 帧）===')
console.log('  平均 ' + avg.toFixed(1) + 'ms    P95 ' + sorted[Math.floor(sorted.length * 0.95)].toFixed(1) + 'ms    卡顿帧 ' + frames.filter(f => f > 32).length + '/180')

console.log('\n变化采样点数: ' + changed + (changed > 0 ? '  → 动画确实在跑 ✓' : '  → 没有变化 ✗'))

// 关闭动效偏好时应停住
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
const p2 = await ctx2.newPage()
await p2.goto(base + '/welcome', { waitUntil: 'load' })
await p2.waitForTimeout(700)
const a = await p2.evaluate(() => Number(getComputedStyle(document.querySelector('.glass-mesh i')).opacity).toFixed(3))
await p2.waitForTimeout(1500)
const b = await p2.evaluate(() => Number(getComputedStyle(document.querySelector('.glass-mesh i')).opacity).toFixed(3))
console.log('prefers-reduced-motion 下: ' + a + ' → ' + b + (a === b ? '  → 已停住 ✓' : '  → 仍在动 ✗'))
await ctx2.close()

await browser.close()
server.close()

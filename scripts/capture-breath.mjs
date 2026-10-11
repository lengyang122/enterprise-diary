// 采集背景在若干个时间点的帧，用来量化动效到底看不看得出来。
//
// 用法：node scripts/capture-breath.mjs [路由]
//   默认 /welcome（进入页，用 authBreath 0.26–0.70）
//   传 /       （主页，用 meshBreath 0.68–0.98）
// 注意两页用的是不同的 keyframes，测哪一页必须显式指定 ——
// 之前就因为默认只抓 /welcome，改全局 meshBreath 时量了半天没反应。
import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const OUT = path.join(__dirname, '..', '.breath-frames')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const ROUTE = process.argv[2] || '/welcome'

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

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EDGE })

// 主页有侧边栏与卡片，要挑一块「纯背景」区域来截，
// 否则卡片本身纹丝不动会把差异稀释掉。
// 视口取宽一点，露出更多背景。
const isApp = ROUTE !== '/welcome'
const page = await browser.newPage({
  viewport: isApp ? { width: 1600, height: 900 } : { width: 900, height: 700 },
  deviceScaleFactor: 1,
})
await page.addInitScript(() => {
  try {
    localStorage.setItem('enterprise-diary-entered', '1')
  } catch {
    /* ignore */
  }
})
await page.goto(base + ROUTE, { waitUntil: 'load' })
await page.waitForTimeout(1200)

// 主页：侧边栏右缘(约 248) 到内容卡片左缘(约 490) 之间是纯背景
const CLIP = isApp ? { x: 250, y: 0, width: 238, height: 900 } : { x: 0, y: 0, width: 220, height: 700 }

const N = 10
const GAP = 1400
for (let i = 0; i < N; i++) {
  await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`), clip: CLIP })
  if (i < N - 1) await page.waitForTimeout(GAP)
}

const state = await page.evaluate(() =>
  [...document.querySelectorAll('.glass-mesh i')].map(el => Number(getComputedStyle(el).opacity).toFixed(2))
)
console.log(`采样路由 ${ROUTE}，${N} 帧，间隔 ${GAP}ms，裁剪区 x=${CLIP.x} w=${CLIP.width}`)
console.log('末帧光斑透明度: ' + state.join(' / '))

await browser.close()
server.close()

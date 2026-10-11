// 采集进入页背景在若干个时间点的帧，用来量化「呼吸」到底看不看得出来。
// 用同一台机器、同一个视口、不随窗口尺寸变化，帧间差异只来自背景动画。
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
const page = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 })
await page.goto(base + '/welcome', { waitUntil: 'load' })
await page.waitForTimeout(1200)

// 只截背景区域（避开卡片），差异才纯粹来自光斑
const CLIP = { x: 0, y: 0, width: 220, height: 700 }

const N = 10
const GAP = 1400 // ms，覆盖最长 13s 的一个循环
for (let i = 0; i < N; i++) {
  await page.screenshot({ path: path.join(OUT, `f${String(i).padStart(2, '0')}.png`), clip: CLIP })
  if (i < N - 1) await page.waitForTimeout(GAP)
}

// 顺便记录每个采样点的光斑状态，确认采样确实落在循环的不同相位
const state = await page.evaluate(() =>
  [...document.querySelectorAll('.glass-mesh i')].map(el => Number(getComputedStyle(el).opacity).toFixed(2))
)
console.log('采样 ' + N + ' 帧，间隔 ' + GAP + 'ms')
console.log('末帧光斑透明度: ' + state.join(' / '))
console.log('输出目录: ' + OUT)

await browser.close()
server.close()

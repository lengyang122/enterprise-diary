// 临时探针：验证历史详情弹窗展开后，滚轮不会再把整页滚走
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

// 造 20 篇记录，让列表足够长、页面能滚；正文写长一些，让弹窗自身也超出视口
const entries = Array.from({ length: 20 }, (_, i) => ({
  id: 'e' + i,
  date: `10月${i + 1}日`,
  position: 'PQE',
  content: `第 ${i + 1} 天的实习内容，这一句用来把弹窗撑高以便验证内部滚动。`.repeat(12),
  feelings: `第 ${i + 1} 天的体会，同样写长一些。`.repeat(12),
  other: `第 ${i + 1} 天的其他记录。`.repeat(6),
  created_at: '2026-10-11T10:00:00.000Z',
}))
const SEED = [
  `localStorage.setItem('enterprise-diary-entered','1')`,
  `localStorage.setItem('enterprise-diary-profile', '{"name":"冷阳","company":"PQE"}')`,
  `localStorage.setItem('enterprise-diary-entries', ${JSON.stringify(JSON.stringify(entries))})`,
]

const browser = await chromium.launch({ executablePath: EDGE })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
for (const s of SEED) await page.addInitScript(s)
await page.goto(base + '/history', { waitUntil: 'load' })
await page.waitForTimeout(1000)

// 打开第一条记录。
// 注意：列表把日期拆成「日」与「月」两段渲染，页面上并不存在 "10月1日" 这个完整字符串，
// 所以按卡片选择器点，而不是按日期文本。
await page.locator('main button.glass').first().click()
await page.waitForTimeout(700)

const opened = await page.locator('.fixed.inset-0.z-50').count()
console.log('弹窗已展开: ' + (opened ? '✓' : '✗'))

// 把鼠标移到遮罩上（弹窗左侧的空白区），再滚轮
await page.mouse.move(60, 400)
await page.mouse.wheel(0, 600)
await page.waitForTimeout(400)

const afterBackdrop = await page.evaluate(() => ({
  pageScrollY: window.scrollY,
  bodyOverflow: document.body.style.overflow,
}))

console.log('\n在遮罩上滚动 600px 后：')
console.log('  页面 scrollY = ' + afterBackdrop.pageScrollY + (afterBackdrop.pageScrollY === 0 ? '  ✓ 页面没被滚走' : '  ✗ 页面被滚走了'))
console.log('  body overflow = "' + afterBackdrop.bodyOverflow + '"' + (afterBackdrop.bodyOverflow === 'hidden' ? '  ✓ 已锁定' : '  ✗ 未锁定'))

// 再滚弹窗内部
await page.mouse.move(640, 400)
await page.mouse.wheel(0, 400)
await page.waitForTimeout(400)
const afterModal = await page.evaluate(() => {
  const overlay = document.querySelector('.fixed.inset-0.z-50')
  return {
    pageScrollY: window.scrollY,
    overlay: overlay
      ? { scrollTop: overlay.scrollTop, scrollHeight: overlay.scrollHeight, clientHeight: overlay.clientHeight }
      : null,
  }
})
console.log('\n在弹窗上滚动 400px 后：')
console.log('  页面 scrollY = ' + afterModal.pageScrollY + (afterModal.pageScrollY === 0 ? '  ✓' : '  ✗ 页面被滚走'))
if (afterModal.overlay) {
  const o = afterModal.overlay
  const canScroll = o.scrollHeight > o.clientHeight
  console.log(
    `  弹窗 scrollHeight=${o.scrollHeight} clientHeight=${o.clientHeight} scrollTop=${o.scrollTop}`
  )
  if (!canScroll) console.log('    （内容未超出视口，无需滚动 —— 这组数据测不到内部滚动）')
  else console.log('    ' + (o.scrollTop > 0 ? '✓ 弹窗自己在滚' : '✗ 内容超出却滚不动'))
}

await browser.close()
server.close()

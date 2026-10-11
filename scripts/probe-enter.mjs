// 临时探针：手机端从「揭晓页」点「开始记录」到进入主页，到底发生了什么
//
// 用 CDP 把 CPU 降速模拟真机（headless 跑满帧不代表手机也快），
// 并分别测「正常」与「localStorage 写入失败」两种情况。
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

async function run(label, { throttle, breakSetItem, hideBg, hideGlass }) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 120)))
  page.on('console', m => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120))
  })

  if (breakSetItem) {
    // 模拟 iOS 隐私模式 / 配额满：setItem 抛异常
    await page.addInitScript(() => {
      const orig = Storage.prototype.setItem
      Storage.prototype.setItem = function (k, v) {
        if (k === 'enterprise-diary-profile') throw new Error('QuotaExceededError')
        return orig.call(this, k, v)
      }
    })
  }

  const cdp = await ctx.newCDPSession(page)
  if (throttle) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })

  await page.goto(base + '/welcome', { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await page.getByPlaceholder('比如：冷阳').fill('冷阳')
  await page.locator('.auth-submit').click()
  await page.waitForTimeout(1700)

  const onReveal = await page.getByText('开始记录').count()

  // 注入样式以隔离变量（注入的样式跨 SPA 跳转依然有效，因为文档没有重新加载）
  const css = []
  if (hideBg) css.push('.glass-mesh, .glass-grain { display: none !important; }')
  if (hideGlass) css.push('.glass { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }')
  if (css.length) await page.addStyleTag({ content: css.join('\n') })

  const t0 = Date.now()
  await page.locator('.auth-submit').click().catch(() => {})

  let landed = false
  try {
    await page.getByText('今天发生了什么？').waitFor({ state: 'visible', timeout: 12000 })
    landed = true
  } catch {
    /* 超时 */
  }
  const ms = Date.now() - t0

  const btn = await page.locator('.auth-submit').first()
  const btnText = (await btn.count()) ? (await btn.textContent().catch(() => '')) : '(已离开该页)'
  const btnDisabled = (await btn.count()) ? await btn.isDisabled().catch(() => null) : null

  console.log(`\n【${label}】`)
  console.log(`  揭晓页出现: ${onReveal ? '✓' : '✗'}`)
  console.log(`  点「开始记录」→ 主页出现: ${landed ? '✓ ' + ms + 'ms' : '✗ 12 秒内没进去'}`)
  console.log(`  按钮状态: 「${(btnText || '').trim()}」 ${btnDisabled === null ? '' : btnDisabled ? '(已禁用)' : '(可点)'}`)
  if (errors.length) console.log('  错误: ' + errors.slice(0, 3).join(' | '))
  else console.log('  错误: 无')

  await ctx.close()
}

await run('A · 正常（CPU 降速 6x）', { throttle: 6, breakSetItem: false })
await run('B · localStorage 写入失败（CPU 降速 6x）', { throttle: 6, breakSetItem: true })
await run('C · 正常（CPU 降速 10x，接近低端机）', { throttle: 10, breakSetItem: false })
await run('D · 正常（CPU 降速 20x，压力测试）', { throttle: 20, breakSetItem: false })
// 下面两组用来定位耗时来源（都固定 10x）
await run('E · 关掉背景光斑（10x）', { throttle: 10, hideBg: true })
await run('F · 关掉光斑 + 关掉玻璃模糊（10x）', { throttle: 10, hideBg: true, hideGlass: true })

await browser.close()
server.close()

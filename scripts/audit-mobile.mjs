// 移动端适配体检：按真实机型尺寸检查常见问题
import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const OUT = path.join(__dirname, '..', 'screenshots')
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

const DEVICES = [
  { name: 'iPhone SE', w: 375, h: 667, dpr: 2, safeBottom: 0 },
  { name: 'iPhone 15 Pro', w: 393, h: 852, dpr: 3, safeBottom: 34 }, // 有 Home 指示条
  { name: 'Pixel 8', w: 412, h: 915, dpr: 2.6, safeBottom: 24 },
  { name: '小屏安卓', w: 360, h: 640, dpr: 3, safeBottom: 0 },
  { name: 'iPhone 横屏', w: 852, h: 393, dpr: 3, safeBottom: 21 },
]

const ROUTES = [
  { path: '/', name: '新建日记' },
  { path: '/history', name: '历史记录' },
  { path: '/settings', name: '设置' },
  { path: '/welcome', name: '进入页' },
]

const browser = await chromium.launch({ executablePath: EDGE })

for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h },
    deviceScaleFactor: d.dpr,
    isMobile: true,
    hasTouch: true,
  })
  const page = await ctx.newPage()
  // 标记已走过进入页，否则 / 会被重定向到 /welcome，体检就跑偏了
  await page.addInitScript(() => {
    try {
      localStorage.setItem('enterprise-diary-entered', '1')
    } catch {
      /* ignore */
    }
  })
  console.log(`\n${'='.repeat(64)}\n${d.name}  ${d.w}x${d.h} @${d.dpr}x  (底部安全区 ${d.safeBottom}px)\n${'='.repeat(64)}`)

  for (const r of ROUTES) {
    await page.goto(base + r.path, { waitUntil: 'load' })
    await page.waitForTimeout(700)

    const rep = await page.evaluate(safeBottom => {
      const vw = window.innerWidth
      const out = {}

      // 1. 横向溢出
      out.scrollW = document.documentElement.scrollWidth
      out.vw = vw
      out.hOverflow = out.scrollW - vw
      // 溢出时找出越界的元素，便于定位
      if (out.hOverflow > 0) {
        const bad = []
        document.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect()
          if (r.width === 0) return
          if (r.right > vw + 0.5 || r.left < -0.5) {
            const cls = (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 60)
            bad.push({
              tag: el.tagName,
              cls,
              left: Math.round(r.left),
              right: Math.round(r.right),
              w: Math.round(r.width),
            })
          }
        })
        // 只保留最内层的几个（外层祖先通常也会越界）
        out.overflowEls = bad.slice(-6)
      }

      // 2. 可交互元素中触控目标过小的
      const small = []
      document.querySelectorAll('button, a, input, textarea, select, [role="button"]').forEach(el => {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) return
        if (r.width < 44 || r.height < 44) {
          const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 14)
          small.push({ label, w: Math.round(r.width), h: Math.round(r.height) })
        }
      })
      out.smallTargets = small

      // 3. 输入框字号（iOS 上 <16px 聚焦会自动放大页面）
      const zoomRisk = []
      document.querySelectorAll('input, textarea').forEach(el => {
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 16) zoomRisk.push({ fs, tag: el.tagName, ph: (el.getAttribute('placeholder') || '').slice(0, 12) })
      })
      out.zoomRisk = zoomRisk

      // 4. 固定底部导航 vs 内容底部内边距（是否被遮住）
      //    只在移动布局下检查，且要排除抽屉里的导航 ——
      //    querySelector('nav') 现在会先找到抽屉面板里的那个，
      //    它是竖向列表（宽度远小于视口），不是横贯底部的导航条。
      if (window.innerWidth < 768) {
        const nav = document.querySelector('nav')
        if (nav) {
          const nr = nav.getBoundingClientRect()
          const looksLikeBottomBar =
            nr.width > window.innerWidth * 0.8 && window.innerHeight - nr.bottom < 40
          if (looksLikeBottomBar) {
            out.navBottom = Math.round(window.innerHeight - nr.bottom)
            out.navHeight = Math.round(nr.height)
            const content = document.querySelector('main > div')
            out.mainPadBottom = content ? parseFloat(getComputedStyle(content).paddingBottom) : null
          }
        }
      }

      // 5. 底部导航与安全区
      out.safeBottomPx = safeBottom

      // 6. viewport meta
      const meta = document.querySelector('meta[name="viewport"]')
      out.viewportMeta = meta ? meta.getAttribute('content') : '(缺失)'

      return out
    }, d.safeBottom)

    console.log(`\n  [${r.name}] ${r.path}`)
    console.log(`    横向溢出: ${rep.hOverflow > 0 ? '⚠ ' + rep.hOverflow + 'px (scrollW ' + rep.scrollW + ' > vw ' + rep.vw + ')' : '✓ 无'}`)
    if (rep.overflowEls) {
      for (const e of rep.overflowEls) {
        console.log(`        越界: ${e.tag} [${e.left}..${e.right}] w=${e.w}  ${e.cls}`)
      }
    }
    console.log(`    viewport: ${rep.viewportMeta}`)
    if (rep.navHeight) {
      console.log(`    底部导航: 高 ${rep.navHeight}px，距视口底 ${rep.navBottom}px；安全区需 ${rep.safeBottomPx}px`)
      const need = d.safeBottom
      if (rep.navBottom < need) console.log(`      ⚠ 导航底部内边距不足，会被 Home 指示条压住 ${need - rep.navBottom}px`)
      if (rep.mainPadBottom !== null && rep.mainPadBottom < rep.navHeight) {
        console.log(`      ⚠ main 的 padding-bottom=${rep.mainPadBottom}px < 导航高 ${rep.navHeight}px —— 内容可能被遮住`)
      } else if (rep.mainPadBottom !== null) {
        console.log(`      ✓ main padding-bottom=${rep.mainPadBottom}px ≥ 导航高`)
      }
    }
    if (rep.zoomRisk.length) {
      const s = [...new Set(rep.zoomRisk.map(z => z.fs + 'px'))].join(', ')
      console.log(`    ⚠ 输入框字号 <16px（iOS 聚焦会放大页面）: ${s}`)
    } else {
      console.log(`    ✓ 输入框字号均 ≥16px`)
    }
    if (rep.smallTargets.length) {
      console.log(`    ⚠ 触控目标 <44px 共 ${rep.smallTargets.length} 个:`)
      for (const t of rep.smallTargets.slice(0, 6)) console.log(`        ${t.w}x${t.h}  ${t.label}`)
      if (rep.smallTargets.length > 6) console.log(`        …另有 ${rep.smallTargets.length - 6} 个`)
    } else {
      console.log(`    ✓ 触控目标均 ≥44px`)
    }

    if (r.path === '/') {
      const tag = d.name.replace(/\s/g, '')
      await page.screenshot({ path: path.join(OUT, `mob-${tag}.png`) })
    }
  }
  await ctx.close()
}

await browser.close()
server.close()
console.log('\n截图已输出到 screenshots/mob-*.png')

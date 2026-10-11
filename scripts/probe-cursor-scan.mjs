// 一次性普查：页面上哪些元素的光标不是「箭头」或「手型」
//
// 之前四次都是按用户指出的单点修，这次改成全量扫描，
// 把还残留 I 形文字光标的元素一次找出来。
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

const SEED_PROFILE = `localStorage.setItem('enterprise-diary-profile', ${JSON.stringify(
  JSON.stringify({
    name: '冷阳', student_id: '', class_name: '', college: '', major: '',
    teacher: '', company: 'PQE', company_teacher: '', start_date: '', end_date: '',
  })
)})`
const SEED_AI = `localStorage.setItem('enterprise-diary-ai-config', ${JSON.stringify(
  JSON.stringify({ apiKey: 'sk-x', apiUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'm' })
)})`

const browser = await chromium.launch({ executablePath: EDGE })

// 在页面里执行：挑出会显示 I 形文字光标、且带文字的元素（只取最内层，减少噪音）
const SCAN = `(() => {
  const out = []
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) return
    const cs = getComputedStyle(el)
    if (cs.cursor !== 'auto' && cs.cursor !== 'text') return
    const txt = (el.textContent || '').trim().slice(0, 22)
    if (!txt) return
    const childHasText = [...el.children].some(c => {
      const ccs = getComputedStyle(c)
      return (ccs.cursor === 'auto' || ccs.cursor === 'text') && (c.textContent || '').trim()
    })
    if (childHasText) return
    out.push({
      tag: el.tagName,
      cursor: cs.cursor,
      cls: (typeof el.className === 'string' ? el.className : '').slice(0, 46),
      txt,
    })
  })
  return out
})()`

for (const item of [
  { label: '输入态', route: '/', seed: [SEED_PROFILE, SEED_AI] },
  { label: '进入页', route: '/welcome', seed: [] },
  { label: '历史记录', route: '/history', seed: [SEED_PROFILE] },
  { label: '设置', route: '/settings', seed: [SEED_PROFILE, SEED_AI] },
]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    try {
      localStorage.setItem('enterprise-diary-entered', '1')
    } catch {
      /* ignore */
    }
  })
  if (item.seed.length) await page.addInitScript(item.seed.join('\n'))
  await page.goto(base + item.route, { waitUntil: 'load' })
  await page.waitForTimeout(900)

  const hits = await page.evaluate(SCAN)
  console.log(`\n【${item.label} ${item.route}】残留 I 形文字光标：${hits.length} 个`)
  for (const h of hits.slice(0, 12)) {
    console.log(`  ${h.tag.padEnd(7)} cursor=${h.cursor.padEnd(6)} 「${h.txt}」  ${h.cls}`)
  }
  if (hits.length > 12) console.log(`  …另有 ${hits.length - 12} 个`)

  // 反向核对：输入类元素必须仍然是文字光标，否则打字体验会很怪
  const inputs = await page.evaluate(`(() => {
    const out = []
    document.querySelectorAll('input, textarea').forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width < 4) return
      out.push(el.tagName + '=' + getComputedStyle(el).cursor)
    })
    return out
  })()`)
  const bad = inputs.filter(s => !s.endsWith('=text'))
  console.log(`  输入类元素 ${inputs.length} 个，文字光标 ${inputs.length - bad.length} 个` + (bad.length ? `  ⚠ 异常: ${bad.join(', ')}` : '  ✓'))
  await ctx.close()
}

await browser.close()
server.close()

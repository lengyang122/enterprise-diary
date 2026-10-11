// 决定性测量：把鼠标放到具体坐标上，问浏览器「这里会显示什么光标」
//
// 之前的扫描是按元素查 computedStyle，这次改为按坐标用 elementFromPoint 反查，
// 更贴近「用户把鼠标移到这里会看到什么」。输入态与结果态都测。
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

const SEED = [
  `localStorage.setItem('enterprise-diary-entered','1')`,
  `localStorage.setItem('enterprise-diary-profile', ${JSON.stringify(
    JSON.stringify({ name: '冷阳', company: 'PQE', student_id: '', class_name: '', college: '', major: '', teacher: '', company_teacher: '', start_date: '', end_date: '' })
  )})`,
]

// 结果态草稿
const SEED_RESULT = `localStorage.setItem('enterprise-diary-draft', ${JSON.stringify(
  JSON.stringify({
    form: { date: '10月11日', position: 'PQE', content: '上午产线巡检。', feelings: '', other: '' },
    aiResult: { content: '今天参加了质量相关的会议，主要负责旁听并记录要点。', feelings: '坐在会议室里听大家讨论，和平常在产线旁边看操作是完全不同的感受。', other: '会议时间比预想的长。' },
    updatedAt: '2026-10-11T10:00:00.000Z',
  })
)})`

const browser = await chromium.launch({ executablePath: EDGE })

async function probe(label, route, extraSeed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  for (const s of [...SEED, ...(extraSeed ? [extraSeed] : [])]) await page.addInitScript(s)
  await page.goto(base + route, { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  console.log(`\n【${label}】`)
  const rows = await page.evaluate(() => {
    const out = []
    const seen = new Set()
    // 遍历视口内一串采样点，把「光标形状」归类统计，并给出每类的代表坐标
    for (let y = 40; y < window.innerHeight - 20; y += 24) {
      for (let x = 20; x < window.innerWidth - 20; x += 24) {
        const el = document.elementFromPoint(x, y)
        if (!el) continue
        const cur = getComputedStyle(el).cursor
        if (seen.has(cur)) continue
        seen.add(cur)
        out.push({
          cursor: cur,
          at: `${x},${y}`,
          tag: el.tagName,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
        })
      }
    }
    return out
  })

  for (const r of rows) {
    console.log(`  cursor=${r.cursor.padEnd(8)} 代表坐标 ${r.at.padEnd(9)} <${r.tag}> ${r.cls}`)
  }
  await ctx.close()
}

await probe('输入态 /', '/')
await probe('结果态 /（带已生成结果）', '/', SEED_RESULT)
await probe('历史记录 /history', '/history')
await probe('设置 /settings', '/settings')

await browser.close()
server.close()

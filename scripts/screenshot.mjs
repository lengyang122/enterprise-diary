// ============================================================
// 界面截图脚本（仅用于开发期人工核对视觉效果）
// 直接驱动系统已安装的 Edge，不下载额外浏览器。
//
//   node scripts/screenshot.mjs            # 截全部场景
//   node scripts/screenshot.mjs today      # 只截指定场景（按名称前缀匹配）
//
// 产物输出到 screenshots/，该目录已加入 .gitignore。
// ============================================================

import { chromium } from 'playwright-core'
import http from 'node:http'
import { readFile, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, '..', 'dist')
const OUT = path.join(__dirname, '..', 'screenshots')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

const PROFILE = {
  name: '魏源',
  student_id: '2300602425',
  class_name: '质卓4',
  college: '管理工程与科学',
  major: '质量管理工程',
  teacher: '陈家焱',
  company: '余姚舜宇智能光学技术有限公司',
  company_teacher: '陶凯',
  start_date: '2026年7月7日',
  end_date: '2027年5月7日',
}

const DIARIES = [
  {
    id: 'd1',
    date: '9月2日',
    position: 'PQE',
    content:
      '今天上午参加了 SMT 车间的异常分析会，针对昨天的锡膏印刷不良做了 5Why 分析，最终定位到钢网清洗周期设置偏长。下午跟进了 AOI 误判率的统计，和 NPI 的同事一起复核了判定参数，把误判率从 3.2% 降到了 1.1%。',
    feelings:
      '第一次完整参与一次异常分析，才理解为什么老师傅强调"先看数据再下结论"。之前我习惯凭经验猜测原因，这次按 5Why 一层层问下来，发现真正的原因和我最初想的完全不同。',
    other: '记录了钢网清洗的推荐周期，准备明天核对 QCP 里的对应条款。',
    created_at: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'd2',
    date: '9月1日',
    position: 'PQE',
    content:
      '熟悉了 SMT 车间的整体布局，重点认识了 QCP 的管控逻辑。上午跟着师傅巡检了三条产线，下午整理了昨天的首件检验记录。',
    feelings: '开始意识到质量管控不是事后检验，而是把控制点前移到过程里。',
    other: '',
    created_at: '2026-09-01T10:00:00.000Z',
  },
]

const AI_RESULT = {
  content:
    '今天上午参加了 SMT 车间的异常分析会，针对前一天的锡膏印刷不良组织 5Why 分析，逐层排查后定位到钢网清洗周期设置偏长这一根因。下午跟进 AOI 误判率统计，与 NPI 同事一起复核判定参数，将误判率由 3.2% 降至 1.1%，同时把调整后的参数同步到了对应的管控文件。',
  feelings:
    '这是第一次完整参与一次异常分析，也让我理解了师傅强调"先看数据再下结论"的原因。此前我习惯凭经验推测原因，这次沿着 5Why 一层层追问，最终定位到的根因与我最初判断的完全不同，对过程管控有了更具体的认识。',
  other: '记录了钢网清洗的推荐周期，明天核对 QCP 中的对应条款。',
}

const SEED_PROFILE = `localStorage.setItem('enterprise-diary-profile', ${JSON.stringify(JSON.stringify(PROFILE))})`
const SEED_DIARIES = `localStorage.setItem('enterprise-diary-entries', ${JSON.stringify(JSON.stringify(DIARIES))})`
const SEED_AI_CONFIG = `localStorage.setItem('enterprise-diary-ai-config', ${JSON.stringify(
  JSON.stringify({ apiKey: 'sk-demo-key-for-screenshot', apiUrl: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-v4-flash' })
)})`
const SEED_DRAFT_INPUT = `localStorage.setItem('enterprise-diary-draft', ${JSON.stringify(
  JSON.stringify({
    form: {
      date: '9月3日',
      position: 'PQE',
      content: '上午参加了产线巡检，记录了贴片机的抛料率异常。下午跟师傅学习了 QCP 的更新流程。',
      feelings: '开始能看懂抛料率数据背后的设备状态。',
      other: '',
    },
    aiResult: null,
    updatedAt: '2026-09-03T10:00:00.000Z',
  })
)})`
const SEED_DRAFT_RESULT = `localStorage.setItem('enterprise-diary-draft', ${JSON.stringify(
  JSON.stringify({
    form: {
      date: '9月3日',
      position: 'PQE',
      content: '上午参加了产线巡检，记录了贴片机的抛料率异常。下午跟师傅学习了 QCP 的更新流程。',
      feelings: '开始能看懂抛料率数据背后的设备状态。',
      other: '',
    },
    aiResult: AI_RESULT,
    updatedAt: '2026-09-03T10:00:00.000Z',
  })
)})`

const DESKTOP = { width: 1280, height: 900 }
const MOBILE = { width: 390, height: 844 }

const SCENARIOS = [
  { name: '01-today-empty', route: '/', seed: [SEED_PROFILE, SEED_AI_CONFIG] },
  { name: '02-today-draft', route: '/', seed: [SEED_PROFILE, SEED_AI_CONFIG, SEED_DRAFT_INPUT] },
  { name: '03-today-result', route: '/', seed: [SEED_PROFILE, SEED_AI_CONFIG, SEED_DRAFT_RESULT] },
  {
    name: '04-history-list',
    route: '/history',
    seed: [SEED_PROFILE, SEED_DIARIES],
  },
  {
    name: '05-history-detail',
    route: '/history',
    seed: [SEED_PROFILE, SEED_DIARIES],
    action: async page => {
      await page.getByText('锡膏印刷不良').first().click({ timeout: 5000 }).catch(async () => {
        await page.locator('button').filter({ hasText: 'PQE' }).first().click()
      })
      await page.waitForTimeout(400)
    },
  },
  { name: '06-settings', route: '/settings', seed: [SEED_PROFILE, SEED_AI_CONFIG, SEED_DIARIES] },
  { name: '07-mobile-today', route: '/', seed: [SEED_PROFILE, SEED_AI_CONFIG, SEED_DRAFT_INPUT], viewport: MOBILE },
  { name: '08-mobile-history', route: '/history', seed: [SEED_PROFILE, SEED_DIARIES], viewport: MOBILE },
  { name: '09-mobile-settings', route: '/settings', seed: [SEED_PROFILE, SEED_AI_CONFIG, SEED_DIARIES], viewport: MOBILE },
]

function startStaticServer() {
  return http.createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const rel = urlPath === '/' ? '/index.html' : urlPath
    const file = path.join(DIST, rel)

    try {
      if (!file.startsWith(DIST)) throw new Error('forbidden')
      const data = await readFile(file)
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
      res.end(data)
    } catch {
      // SPA 回退
      try {
        const data = await readFile(path.join(DIST, 'index.html'))
        res.writeHead(200, { 'Content-Type': MIME['.html'] })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end()
      }
    }
  })
}

async function main() {
  const filter = process.argv[2]

  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const server = startStaticServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const base = `http://127.0.0.1:${server.address().port}`

  const browser = await chromium.launch({ executablePath: EDGE })

  const targets = filter ? SCENARIOS.filter(s => s.name.includes(filter)) : SCENARIOS

  for (const scenario of targets) {
    const context = await browser.newContext({
      viewport: scenario.viewport ?? DESKTOP,
      deviceScaleFactor: 2,
    })
    for (const seed of scenario.seed ?? []) {
      await context.addInitScript(seed)
    }

    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(String(e)))
    page.on('console', m => {
      if (m.type() === 'error') errors.push(m.text())
    })

    await page.goto(base + scenario.route, { waitUntil: 'load' })
    await page.waitForTimeout(500)
    if (scenario.action) await scenario.action(page)

    const file = path.join(OUT, `${scenario.name}.png`)
    await page.screenshot({ path: file, fullPage: true })
    console.log(`shotted ${scenario.name}${errors.length ? '  [页面错误] ' + errors.join(' | ') : ''}`)

    await context.close()
  }

  await browser.close()
  server.close()
  console.log(`\n输出目录：${OUT}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})

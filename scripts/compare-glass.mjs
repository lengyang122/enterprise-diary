// 把 design/glass-compare.tsx 打包成单文件并截图，用于对比玻璃质感。
// 不进入应用产物，只服务开发期判断。
//
// 关键：内联的是**应用构建后的真实 CSS**（dist/assets/*.css），
// 所以对比页用的是真的 .glass / .glass-surface-sheen，不是我手抄的近似样式。
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT = path.join(ROOT, 'screenshots')
const TMP = path.join(ROOT, '.glass-compare-tmp')
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

// 0) 取应用构建产物里的 CSS
const assetsDir = path.join(ROOT, 'dist', 'assets')
const cssFile = (await readdir(assetsDir)).find(f => f.endsWith('.css'))
if (!cssFile) throw new Error('dist/assets 下找不到 CSS，请先 npm run build')
const appCss = await readFile(path.join(assetsDir, cssFile), 'utf8')
console.log('内联应用 CSS: ' + cssFile + '  (' + Math.round(appCss.length / 1024) + ' KB)')

// 1) 打包 React 入口
const bundle = await build({
  entryPoints: [path.join(ROOT, 'design', 'glass-compare.tsx')],
  bundle: true,
  format: 'iife',
  jsx: 'automatic',
  minify: true,
  write: false,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'error',
})
const js = bundle.outputFiles[0].text

// 2) 组装 HTML：应用 CSS + 对比页布局 CSS + 内联 JS
const layoutCss = `
  html, body { width: 1240px; background: #eef1f5; }
  .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 22px; }
  .head { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; padding-left: 2px; }
  .head b { font-size: 14px; }
  .head span { font-size: 11.5px; color: #6b7280; font-family: Consolas, monospace; }

  .stage { position: relative; height: 470px; border-radius: 18px; overflow: hidden;
           border: 1px solid rgba(0,0,0,.07); }

  .mesh { position: absolute; inset: 0; }
  .mesh i { position: absolute; display: block; border-radius: 50%; filter: blur(96px); opacity: .74; }
  .mesh i:nth-child(1) { width: 620px; height: 620px; background: #8fb0d8; top: -260px; left: -200px; }
  .mesh i:nth-child(2) { width: 560px; height: 560px; background: #bfc9e2; top: -220px; right: -160px; }
  .mesh i:nth-child(3) { width: 600px; height: 600px; background: #9fc4d6; bottom: -300px; left: 120px; }
  .mesh i:nth-child(4) { width: 520px; height: 520px; background: #d9cdc3; bottom: -240px; right: 20px; }

  /* 精细纹理：折射/色散是否成立，全靠它才看得出来 */
  .texture { position: absolute; inset: 0; padding: 10px 0; overflow: hidden; }
  .tex { font-size: 13px; line-height: 20px; color: #2a2f3a; white-space: nowrap;
         font-family: Consolas, monospace; opacity: .85; }

  .overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .stack { display: flex; flex-direction: column; align-items: center; gap: 20px; }

  /* A/C 侧：改动前的纯磨砂玻璃，用于对照 */
  .plainGlass {
    position: relative;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,.72);
    background: rgba(255,255,255,.42);
    -webkit-backdrop-filter: blur(28px) saturate(185%);
    backdrop-filter: blur(28px) saturate(185%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(255,255,255,.28),
                0 10px 40px -14px rgba(28,38,64,.24);
  }

  .card { width: 320px; padding: 18px 20px; }
  .body h3 { font-size: 14.5px; font-weight: 600; margin-bottom: 10px; letter-spacing: -.01em; }
  .body p { font-size: 13.5px; line-height: 1.85; }

  .pill { padding: 13px 30px; border-radius: 999px; }
  .pillText { font-size: 14px; font-weight: 600; color: #14324f; }

  .miniNav { display: flex; align-items: center; gap: 4px; padding: 6px; border-radius: 18px; }
  .miniItem { font-size: 13px; padding: 8px 16px; border-radius: 13px; color: #4b5563; }
  .miniActive { color: #1c1c1e; font-weight: 600; background: rgba(255,255,255,.72);
                box-shadow: 0 1px 2px rgba(28,38,64,.12); }
`

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>玻璃质感对比</title>
<style>${appCss}</style>
<style>${layoutCss}</style>
</head>
<body><div id="root"></div>
<script>${js}</script>
</body></html>`

const htmlPath = path.join(TMP, 'compare.html')
await writeFile(htmlPath, html, 'utf8')

// 3) 截图
const browser = await chromium.launch({ executablePath: EDGE })
const page = await browser.newPage({ viewport: { width: 1240, height: 760 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
await page.waitForTimeout(1000)

// 确认 B/D 侧真的挂上了 url() 滤镜
const applied = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('.glass').forEach(e => {
    const bf = getComputedStyle(e).backdropFilter
    if (bf && bf !== 'none') out.push(bf)
  })
  return out
})

const out = path.join(OUT, 'glass-compare.png')
await page.screenshot({ path: out, fullPage: true })
await browser.close()

await rm(TMP, { recursive: true, force: true })
console.log('rendered -> ' + out)
console.log('生效的 backdrop-filter:')
for (const a of applied) console.log('  ' + a)
if (errors.length) console.log('页面错误: ' + errors.join(' | '))

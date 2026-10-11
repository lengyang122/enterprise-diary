// 把 design/glass-compare.tsx 打包成单文件并截图，用于对比玻璃质感。
// 不进入应用产物，只服务开发期判断。
//
// 注意：我们自己的玻璃类名在这里用 .ours，因为 liquid-glass-react 内部根节点
// 就叫 className="glass" —— 两边同名会互相污染样式。
import { build } from 'esbuild'
import { chromium } from 'playwright-core'
import { mkdir, writeFile, rm } from 'node:fs/promises'
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

// 2) 组装 HTML（JS 内联，避免 file:// 下的模块 CORS 限制）
const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>玻璃质感对比</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1240px; background: #eef1f5; }
  body { -webkit-font-smoothing: antialiased; color: #1c1c1e;
         font-family: -apple-system, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }

  .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 22px; }
  .head { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; padding-left: 2px; }
  .head b { font-size: 14px; }
  .head span { font-size: 11.5px; color: #6b7280; font-family: Consolas, monospace; }

  .stage { position: relative; height: 460px; border-radius: 18px; overflow: hidden;
           border: 1px solid rgba(0,0,0,.07); }

  .mesh { position: absolute; inset: 0; }
  .mesh i { position: absolute; display: block; border-radius: 50%; filter: blur(96px); opacity: .74; }
  .mesh i:nth-child(1) { width: 620px; height: 620px; background: #8fb0d8; top: -260px; left: -200px; }
  .mesh i:nth-child(2) { width: 560px; height: 560px; background: #bfc9e2; top: -220px; right: -160px; }
  .mesh i:nth-child(3) { width: 600px; height: 600px; background: #9fc4d6; bottom: -300px; left: 120px; }
  .mesh i:nth-child(4) { width: 520px; height: 520px; background: #d9cdc3; bottom: -240px; right: 20px; }

  .texture { position: absolute; inset: 0; padding: 10px 0; overflow: hidden; }
  .tex { font-size: 13px; line-height: 20px; color: #2a2f3a; white-space: nowrap;
         font-family: Consolas, monospace; opacity: .85; }

  .overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
  .row { display: flex; flex-direction: column; align-items: center; gap: 22px; }

  /* ===== A：我们现在的玻璃（类名刻意避开 .glass） ===== */
  .ours {
    position: relative;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,.72);
    background: rgba(255,255,255,.42);
    -webkit-backdrop-filter: blur(28px) saturate(185%);
    backdrop-filter: blur(28px) saturate(185%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(255,255,255,.28),
                0 10px 40px -14px rgba(28,38,64,.24);
  }
  .ours::before {
    content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255,.7) 0%, rgba(255,255,255,.12) 22%, rgba(255,255,255,0) 50%);
  }
  .ours > * { position: relative; }

  .card { width: 320px; padding: 18px 20px; }
  .plain { width: 280px; }
  .plain h3 { font-size: 14.5px; font-weight: 600; margin-bottom: 10px; letter-spacing: -.01em; }
  .plain p { font-size: 13.5px; line-height: 1.85; }
  .cardInner { padding: 18px 20px; }
  .cardInner h3 { font-size: 14.5px; font-weight: 600; margin-bottom: 10px; letter-spacing: -.01em; }
  .cardInner p { font-size: 13.5px; line-height: 1.85; }

  .pillBtn {
    border-radius: 999px; padding: 12px 28px; font-size: 14px; font-weight: 600;
    color: #fff; background: linear-gradient(170deg,#3fa0ff,#0a84ff);
    box-shadow: 0 10px 26px -10px rgba(10,132,255,.9), inset 0 1px 0 rgba(255,255,255,.45);
    border: 0;
  }
  .pillBtn::before { display: none; }
  .btnText { font-size: 14px; font-weight: 600; color: #14324f; }
</style></head>
<body><div id="root"></div>
<script>${js}</script>
</body></html>`

const htmlPath = path.join(TMP, 'compare.html')
await writeFile(htmlPath, html, 'utf8')

// 3) 截图
const browser = await chromium.launch({ executablePath: EDGE })
const page = await browser.newPage({ viewport: { width: 1240, height: 700 }, deviceScaleFactor: 2 })
const errors = []
page.on('pageerror', e => errors.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
await page.waitForTimeout(900)

const out = path.join(OUT, 'glass-compare.png')
await page.screenshot({ path: out, fullPage: true })
await browser.close()

await rm(TMP, { recursive: true, force: true })
console.log('rendered -> ' + out)
if (errors.length) console.log('页面错误: ' + errors.join(' | '))

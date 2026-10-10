// 把 design/ 下的风格备选页渲染成图片，仅供开发期比较视觉方向
import { chromium } from 'playwright-core'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const target = process.argv[2] || 'style-options.html'

const file = path.join(__dirname, '..', 'design', target)
const out = path.join(__dirname, '..', 'screenshots', target.replace(/\.html$/, '.png'))

const browser = await chromium.launch({ executablePath: EDGE })
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 })
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' })
await page.waitForTimeout(400)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('rendered -> ' + out)

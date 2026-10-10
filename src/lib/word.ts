// ============================================================
// Word 导出 —— 基于学校原始模板 .docx 填充文字，保留 100% 原始格式
//
// 设计要点：
// 1. 模板定位依赖原始占位文本（模板里的旧姓名、旧实习内容等），
//    这类字符串一旦失配，过去会「静默输出模板原文」，使用者拿到别人的内容
//    却看到「下载成功」。现在改为：替换结果逐项校验，任一失配即抛
//    WordTemplateError，并在界面上明确报错。
// 2. 替换顺序很重要：先替换长正文占位（旧实习内容里也含 "PQE" 等短词），
//    再替换短字段，避免短词被误替换到正文里。
// 3. 导出拆成「生成 Blob」与「保存下载」两步，便于批量打包成 zip。
// ============================================================

import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { TEMPLATE_BASE64 } from './templateData'
import { countHanzi } from './text'
import type { DiaryWordData } from '../types'

// === 工具函数 ===

export function safeText(text: string, max = 80): string {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) count++
    if (count > max) return text.slice(0, i).replace(/[，,、\s]*$/, '') + '。'
  }
  return text
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ============================================================
// 核心替换逻辑：定位到 <w:r> 级别，保留格式
// ============================================================

interface WrBlock {
  start: number // <w:r 的位置
  end: number // </w:r> 之后的位置
  prefix: string // <w:r> 到 <w:t 之间的内容（含 <w:rPr> 格式）
  prefixIndent: string // <w:r> 前面的空白字符
  text: string // <w:t> 内的文本
}

export interface ReplaceResult {
  xml: string
  replaced: boolean
}

// 仅供诊断与测试：把文档内所有 <w:r> 的文本按顺序拼接。
// 注意模板里的一段文字可能被 Word 拆进多个 run，
// 所以判断「占位文本是否存在」必须基于拼接结果，而不是直接搜 XML 字符串。
export function flattenRunText(xml: string): string {
  const wrRe = /(\s*)<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g
  const parts: string[] = []
  let m: RegExpExecArray | null
  while ((m = wrRe.exec(xml)) !== null) {
    const wt = m[3].match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    parts.push(wt ? wt[1] : '')
  }
  return parts.join('')
}

// 把 oldText 替换为 newText（只替换第一处）。
// 文本可能被 Word 拆进多个 <w:r>，这里按拼接后的文本定位，再合并为一个 run。
export function replaceInXml(xml: string, oldText: string, newText: string): ReplaceResult {
  if (!oldText) return { xml, replaced: false }

  // 匹配每个完整的 <w:r>...</w:r> 块（非贪婪，排除 <w:rPr>）
  const wrRe = /(\s*)<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g
  const blocks: WrBlock[] = []
  let m: RegExpExecArray | null
  while ((m = wrRe.exec(xml)) !== null) {
    const full = m[0]
    const indent = m[1]
    const inner = m[3]
    // 从 inner 中找到 <w:t> 标签
    const wtMatch = inner.match(/<w:t[^>]*>([^<]*)<\/w:t>/)
    const text = wtMatch ? wtMatch[1] : ''
    const wtTagIdx = inner.indexOf('<w:t')
    // prefix = <w:r> 标签头 + inner 中 <w:t 之前的内容（即格式信息如 <w:rPr>）
    const prefix =
      (m[2] ? ' ' + m[2].trim() : '') + '>' + (wtTagIdx >= 0 ? inner.slice(0, wtTagIdx) : inner)
    blocks.push({
      start: m.index,
      end: m.index + full.length,
      prefix,
      prefixIndent: indent,
      text,
    })
  }

  // 拼接所有文本查找目标
  const flat = blocks.map(b => b.text).join('')
  const pos = flat.indexOf(oldText)
  if (pos < 0) return { xml, replaced: false }

  // 每一块在拼接文本中的起始偏移
  const offsets: number[] = []
  let acc = 0
  for (const b of blocks) {
    offsets.push(acc)
    acc += b.text.length
  }

  // 确定覆盖的 blocks 范围
  let first = -1
  let last = -1
  for (let i = 0; i < blocks.length; i++) {
    const next = offsets[i] + blocks[i].text.length
    // 当前 block 包含 pos（匹配起始位置）
    if (first < 0 && next > pos) first = i
    // 当前 block 包含 pos + oldText.length（匹配结束位置）
    if (next >= pos + oldText.length) {
      last = i
      break
    }
  }
  if (first < 0 || last < 0) return { xml, replaced: false }

  // 匹配区间常常只占 run 的一部分（如 run 文本为「姓    名：魏源」）。
  // 必须保留匹配区间前后的文字，否则会连带丢掉标签或同 run 的其他内容。
  const prefixText = blocks[first].text.slice(0, pos - offsets[first])
  const suffixText = blocks[last].text.slice(pos + oldText.length - offsets[last])

  const before = xml.slice(0, blocks[first].start)
  const after = xml.slice(blocks[last].end)

  // 用第一个 block 的 prefix（含 <w:rPr>）重建一个 <w:r> 元素，
  // 匹配跨越的其余 run 被合并进来，格式沿用第一个 run
  const replacement =
    blocks[first].prefixIndent +
    '<w:r' +
    blocks[first].prefix +
    '<w:t xml:space="preserve">' +
    esc(prefixText + newText + suffixText) +
    '</w:t></w:r>'

  return { xml: before + replacement + after, replaced: true }
}

// ============================================================
// 模板占位表
// 每项标注了 oldText 在模板里对应的「字段名」，失配时报错才能指得清。
// 顺序敏感：长正文（旧实习内容里含 PQE / QCP 等短词）必须排在最前。
// ============================================================

interface TemplateSlot {
  label: string
  oldText: string
  pick: (d: DiaryWordData) => string
}

export const TEMPLATE_SLOTS: TemplateSlot[] = [
  {
    label: '实习内容',
    oldText:
      '分配到SMT车间进行深入学习三天，今天为第二天，SMT相比于COB，防尘等级更低，车间面积更小，两个车间的任务不同但同时也是紧密联系，作为PQE，我们进入车间要重点学习QCP，质量管控重点，同时也发现了车间存在的生产问题，例如在AOI检测区域，机器的故障导致了产线的效率瞬间降低，如果不及时呼叫NPI部门人员协助，可能间接导致产线生产效率的下降',
    pick: d => safeText(d.content, 200),
  },
  {
    label: '实习体会和感受',
    oldText: '进入车间，要抱着时刻学习的心态，了解每一个流程，才能做好PQE本职工作',
    pick: d => safeText(d.feelings, 200),
  },
  {
    label: '其他',
    oldText: '质量永远是重中之重',
    pick: d => safeText(d.other, 120),
  },
  { label: '姓名', oldText: '魏源', pick: d => d.name },
  { label: '学号', oldText: '2300602425', pick: d => d.student_id },
  { label: '班级', oldText: '质卓4', pick: d => d.class_name },
  { label: '学院', oldText: '管理工程与科学', pick: d => d.college },
  { label: '专业指导教师', oldText: '陈家焱', pick: d => d.teacher },
  { label: '实习单位', oldText: '余姚舜宇智能光学技术有限公司', pick: d => d.company },
  { label: '企业指导教师', oldText: '陶凯', pick: d => d.company_teacher },
  {
    label: '实习起止时间',
    oldText: '2026年 7 月 7 日~   2027 年 5 月  7日',
    pick: d => `${d.start_date}~${d.end_date}`,
  },
  { label: '日期', oldText: '7.17', pick: d => d.date },
  { label: '岗位', oldText: 'PQE', pick: d => d.position },
]

export interface ApplySlotsResult {
  xml: string
  applied: string[]
  missing: string[]
}

// 纯函数：对给定的 document.xml 应用全部占位替换，并逐项汇报命中情况
export function applySlots(docXml: string, data: DiaryWordData): ApplySlotsResult {
  let xml = docXml
  const applied: string[] = []
  const missing: string[] = []

  for (const slot of TEMPLATE_SLOTS) {
    const newText = slot.pick(data) ?? ''
    const result = replaceInXml(xml, slot.oldText, newText)
    xml = result.xml
    if (result.replaced) {
      applied.push(slot.label)
    } else {
      missing.push(slot.label)
    }
  }

  return { xml, applied, missing }
}

// ============================================================
// 模板加载
// ============================================================

export class WordTemplateError extends Error {
  readonly missing: string[]

  constructor(missing: string[]) {
    super(
      `导出失败：内置模板中找不到以下内容的位置 —— ${missing.join('、')}。` +
        `模板可能已被修改，请把这条信息发给开发者更新模板。`
    )
    this.name = 'WordTemplateError'
    this.missing = missing
  }
}

// 模板 base64 解码一次后缓存，批量导出时不必重复解码
let templateBuffer: Uint8Array | null = null

function getTemplateBuffer(): Uint8Array {
  if (templateBuffer) return templateBuffer
  const binary = atob(TEMPLATE_BASE64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  templateBuffer = buffer
  return buffer
}

// 生成填好内容的 document.xml；任一占位失配即抛出 WordTemplateError
export async function renderDocumentXml(data: DiaryWordData): Promise<string> {
  const zip = await JSZip.loadAsync(getTemplateBuffer())
  const docFile = zip.file('word/document.xml')
  if (!docFile) {
    throw new Error('模板文件损坏：缺少 word/document.xml')
  }

  const docXml = await docFile.async('string')
  const { xml, missing } = applySlots(docXml, data)

  if (missing.length) {
    console.error('[Word] 模板占位失配:', missing.join('、'))
    throw new WordTemplateError(missing)
  }

  console.log(
    '[Word] 字数: 实习内容',
    countHanzi(data.content),
    '| 体会',
    countHanzi(data.feelings),
    '| 其他',
    countHanzi(data.other)
  )

  return xml
}

// ============================================================
// 导出前检查
// ============================================================

export interface ExportCheck {
  missingProfile: string[]
  emptySections: string[]
}

const PROFILE_FIELDS: [keyof DiaryWordData, string][] = [
  ['name', '姓名'],
  ['student_id', '学号'],
  ['class_name', '班级'],
  ['college', '学院'],
  ['teacher', '专业指导教师'],
  ['company', '实习单位'],
  ['company_teacher', '企业指导教师'],
  ['start_date', '实习开始日期'],
  ['end_date', '实习结束日期'],
]

// 导出前体检：哪些个人信息没填、哪些正文栏目为空
export function checkExportData(data: DiaryWordData): ExportCheck {
  const missingProfile = PROFILE_FIELDS.filter(([key]) => !String(data[key] ?? '').trim()).map(
    ([, label]) => label
  )

  const emptySections: string[] = []
  if (!String(data.content ?? '').trim()) emptySections.push('实习内容')

  return { missingProfile, emptySections }
}

// 把检查结果拼成给用户看的一句话；没问题时返回空字符串
export function describeExportCheck(check: ExportCheck): string {
  const parts: string[] = []
  if (check.missingProfile.length) {
    parts.push(`这些信息还没填：${check.missingProfile.join('、')}`)
  }
  if (check.emptySections.length) {
    parts.push(`这些栏目是空的：${check.emptySections.join('、')}`)
  }
  return parts.join('；')
}

// ============================================================
// 导出
// ============================================================

export function defaultWordFileName(data: DiaryWordData): string {
  return `企业实践日记_${data.name || '未署名'}_${data.date || ''}.docx`
}

// 生成 .docx 的 Blob（不触发下载）
export async function buildWordBlob(data: DiaryWordData): Promise<Blob> {
  const docXml = await renderDocumentXml(data)

  const zip = await JSZip.loadAsync(getTemplateBuffer())
  zip.file('word/document.xml', docXml)

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
}

export async function downloadWord(data: DiaryWordData, fileName?: string): Promise<void> {
  const blob = await buildWordBlob(data)
  saveAs(blob, fileName || defaultWordFileName(data))
}

// 批量导出为一个 zip
export async function downloadAllWords(
  items: { data: DiaryWordData; fileName: string }[],
  zipName?: string
): Promise<string> {
  if (!items.length) {
    throw new Error('没有可导出的日记')
  }

  const zip = new JSZip()
  const used = new Set<string>()

  for (const item of items) {
    const blob = await buildWordBlob(item.data)
    // 避免同名文件互相覆盖
    let name = item.fileName
    if (used.has(name)) {
      const dot = name.lastIndexOf('.')
      const base = dot > 0 ? name.slice(0, dot) : name
      const ext = dot > 0 ? name.slice(dot) : ''
      let i = 2
      while (used.has(`${base}(${i})${ext}`)) i++
      name = `${base}(${i})${ext}`
    }
    used.add(name)
    zip.file(name, blob)
  }

  const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const name = zipName || `企业实践日记_全部${items.length}篇.zip`
  saveAs(out, name)
  return name
}

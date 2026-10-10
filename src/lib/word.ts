// 基于学校原始模板 .docx 填充文字，保留 100% 原始格式
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { TEMPLATE_BASE64 } from './templateData'
import type { DiaryWordData } from '../types'

// === 工具函数 ===

function countHanzi(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4E00 && code <= 0x9FFF) count++
  }
  return count
}

function safeText(text: string, max = 80): string {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4E00 && code <= 0x9FFF) count++
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
  start: number      // <w:r 的位置
  end: number        // </w:r> 之后的位置
  prefix: string     // <w:r> 到 <w:t 之间的内容（含 <w:rPr> 格式）
  prefixIndent: string // <w:r> 前面的空白字符
  text: string       // <w:t> 内的文本
}

function replaceInXml(xml: string, oldText: string, newText: string): string {
  if (!oldText) return xml

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
    const prefix = (m[2] ? ' ' + m[2].trim() : '') + '>' + (wtTagIdx >= 0 ? inner.slice(0, wtTagIdx) : inner)
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
  if (pos < 0) return xml

  // 确定覆盖的 blocks 范围
  let charIdx = 0
  let first = -1
  let last = -1
  for (let i = 0; i < blocks.length; i++) {
    const next = charIdx + blocks[i].text.length
    // 当前 block 包含 pos（匹配起始位置）
    if (first < 0 && next > pos) first = i
    // 当前 block 包含 pos + oldText.length（匹配结束位置）
    if (next >= pos + oldText.length) { last = i; break }
    charIdx = next
  }
  if (first < 0 || last < 0) return xml

  // 构建替换：保留第一个 <w:r> 的格式，去掉目标范围内的其他 <w:r>
  const before = xml.slice(0, blocks[first].start)
  const after = xml.slice(blocks[last].end)

  // 用第一个 block 的 prefix（含 <w:rPr>）重建一个 <w:r> 元素
  const replacement =
    blocks[first].prefixIndent +
    '<w:r' + blocks[first].prefix +
    '<w:t xml:space="preserve">' + esc(newText) + '</w:t></w:r>'

  return before + replacement + after
}

// ============================================================
// 主函数
// ============================================================

export async function downloadWord(data: DiaryWordData, fileName?: string) {
  console.log('[Word] 开始生成...')
  // 从嵌入的 base64 解码模板（无需网络请求）
  const binary = atob(TEMPLATE_BASE64)
  const buffer = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i)
  console.log('[Word] 模板解码完成,', buffer.byteLength, 'bytes')

  const zip = await JSZip.loadAsync(buffer)
  let docXml = await zip.file('word/document.xml')!.async('string')

  const content = safeText(data.content, 200)
  const feelings = safeText(data.feelings, 200)
  const other = safeText(data.other, 120)

  console.log('[Word] 字数:', countHanzi(content), countHanzi(feelings), countHanzi(other))

  // === 1. 替换个人信息 ===
  const infoPairs: [string, string][] = [
    ['魏源', data.name],
    ['2300602425', data.student_id],
    ['质卓4', data.class_name],
    ['管理工程与科学', data.college],
    ['陈家焱', data.teacher],
    ['余姚舜宇智能光学技术有限公司', data.company],
    ['陶凯', data.company_teacher],
  ]

  // 实习时间替换
  const oldTimeRange = '2026年 7 月 7 日~   2027 年 5 月  7日'
  const newTimeRange = `${data.start_date}~${data.end_date}`
  docXml = replaceInXml(docXml, oldTimeRange, newTimeRange)

  for (const [oldVal, newVal] of infoPairs) {
    docXml = replaceInXml(docXml, oldVal, newVal)
  }

  // === 2. 替换表格内容 ===
  docXml = replaceInXml(docXml, '7.17', data.date)
  docXml = replaceInXml(docXml, 'PQE', data.position)

  // 实习内容
  const oldContent = '分配到SMT车间进行深入学习三天，今天为第二天，SMT相比于COB，防尘等级更低，车间面积更小，两个车间的任务不同但同时也是紧密联系，作为PQE，我们进入车间要重点学习QCP，质量管控重点，同时也发现了车间存在的生产问题，例如在AOI检测区域，机器的故障导致了产线的效率瞬间降低，如果不及时呼叫NPI部门人员协助，可能间接导致产线生产效率的下降'
  docXml = replaceInXml(docXml, oldContent, content)

  // 实习体会和感受
  const oldFeelings = '进入车间，要抱着时刻学习的心态，了解每一个流程，才能做好PQE本职工作'
  docXml = replaceInXml(docXml, oldFeelings, feelings)

  // 其他
  const oldOther = '质量永远是重中之重'
  docXml = replaceInXml(docXml, oldOther, other)

  // 写回并输出
  zip.file('word/document.xml', docXml)
  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })
  const name = fileName || `企业实践日记_${data.name}_${data.date}.docx`
  saveAs(outBlob, name)
  console.log('[Word] 完成')
}

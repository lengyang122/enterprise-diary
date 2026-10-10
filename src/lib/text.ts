// ============================================================
// 纯文本处理：汉字计数、句子级截断、AI 输出的分栏解析
// 本模块不依赖浏览器 / 网络 / DOM，可独立单元测试
// ============================================================

export type SectionKey = 'content' | 'feelings' | 'other'

export interface ParsedSections {
  content: string
  feelings: string
  other: string
  valid: boolean
}

interface Marker {
  key: SectionKey
  start: number
  end: number
}

// 统计汉字字符数（只算 CJK 统一表意文字 4E00-9FFF）
export function countHanzi(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) count++
  }
  return count
}

// 在指定字数位置找到最近的句子结尾截断
export function truncateToSentence(text: string, maxHanzi: number): string {
  const count = countHanzi(text)
  if (count <= maxHanzi) return text

  let hanziCount = 0
  let lastBreak = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4e00 && code <= 0x9fff) {
      hanziCount++
      if (hanziCount > maxHanzi) {
        return lastBreak > 0 ? text.slice(0, lastBreak + 1).trim() : text.slice(0, i).trim()
      }
    }
    if (text[i] === '。' || text[i] === '！' || text[i] === '？') {
      lastBreak = i
    }
  }
  return text.slice(0, lastBreak > 0 ? lastBreak + 1 : text.length).trim()
}

// ============================================================
// Section 解析（多格式容错）
// 支持：===名称=== / 【名称】 / **名称** / ## 名称 / 独占一行的裸标题
// 支持：紧凑无换行格式；解析失败时标记 invalid 走降级路径
// ============================================================

// 各 section 的别名（AI 可能的各种写法）
const SECTION_DEFS: [SectionKey, string[]][] = [
  ['content', ['实习内容']],
  ['feelings', ['实习体会和感受', '实习体会与感受', '实习体会', '体会和感受']],
  ['other', ['其他', '其它']],
]

function findMarkers(text: string): Marker[] {
  const markers: Marker[] = []

  for (const [key, aliases] of SECTION_DEFS) {
    for (const alias of aliases) {
      const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // 形态1: ===别名===（= 数量可变、允许空格）
      const re1 = new RegExp(`={2,}\\s*${esc}\\s*={2,}`, 'g')
      // 形态2: 【别名】
      const re2 = new RegExp(`【\\s*${esc}\\s*】`, 'g')
      // 形态3: 独占一行的裸标题（可带冒号）
      const re3 = new RegExp(`(?:^|\\n)[ \\t]*${esc}[ \\t]*[:：]?[ \\t]*(?=\\n|$)`, 'g')

      let m: RegExpExecArray | null
      while ((m = re1.exec(text)) !== null) {
        markers.push({ key, start: m.index, end: m.index + m[0].length })
      }
      while ((m = re2.exec(text)) !== null) {
        markers.push({ key, start: m.index, end: m.index + m[0].length })
      }
      while ((m = re3.exec(text)) !== null) {
        let start = m.index
        if (m[0].startsWith('\n')) start += 1
        markers.push({ key, start, end: m.index + m[0].length })
      }
    }
  }

  // 按位置排序
  markers.sort((a, b) => a.start - b.start)

  // 去重：重叠的标记保留更长者（如"实习体会和感受" vs "实习体会"）
  const deduped: Marker[] = []
  for (const mk of markers) {
    const last = deduped[deduped.length - 1]
    if (last && mk.start < last.end) {
      if (mk.end - mk.start > last.end - last.start) {
        deduped[deduped.length - 1] = mk
      }
    } else {
      deduped.push(mk)
    }
  }
  return deduped
}

export function parseSections(raw: string): ParsedSections {
  // 预处理：去掉 markdown 装饰符号，保留文本内容
  const text = raw
    .replace(/^\s*#{1,6}\s*/gm, '') // 行首 ### 标题符
    .replace(/\*\*(.+?)\*\*/g, '$1') // **加粗**
    .replace(/__(.+?)__/g, '$1') // __加粗__
    .replace(/^\s*[-*]\s+/gm, '') // 行首列表符

  const markers = findMarkers(text)
  const result: ParsedSections = { content: '', feelings: '', other: '', valid: false }

  // 至少识别出两个标记才算结构有效
  if (markers.length < 2) return result

  for (let i = 0; i < markers.length; i++) {
    const mk = markers[i]
    const end = i + 1 < markers.length ? markers[i + 1].start : text.length
    const body = text.slice(mk.end, end).trim()
    if (!result[mk.key]) result[mk.key] = body
  }

  const foundCount = (result.content ? 1 : 0) + (result.feelings ? 1 : 0) + (result.other ? 1 : 0)
  result.valid = Boolean(result.content) && foundCount >= 2
  return result
}

// 解析结果质量评分（用于两次生成结果择优）
export function sectionScore(p: ParsedSections): number {
  if (!p.valid) return 0
  return countHanzi(p.content) + countHanzi(p.feelings) + countHanzi(p.other)
}

// 降级清理：去掉残留标记符号，输出纯文本
export function stripMarkers(text: string): string {
  return text
    .replace(/={2,}\s*[^=\n]{1,12}\s*={2,}/g, ' ')
    .replace(/【[^】\n]{1,12}】/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

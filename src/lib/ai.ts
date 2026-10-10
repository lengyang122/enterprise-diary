import type { DiaryFormInput, AIGeneratedResult } from '../types'

// AI API 配置（用户可在页面设置中修改）
const AI_CONFIG_KEY = 'enterprise-diary-ai-config'

export interface AIConfig {
  apiKey: string
  apiUrl: string
  model: string
}

export function getAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem(AI_CONFIG_KEY)
    if (!stored) {
      return {
        apiKey: '',
        apiUrl: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-v4-flash',
      }
    }
    const data = JSON.parse(stored)
    return {
      apiKey: data.apiKey || '',
      apiUrl: data.apiUrl || 'https://api.deepseek.com/v1/chat/completions',
      model: data.model || 'deepseek-v4-flash',
    }
  } catch {
    return {
      apiKey: '',
      apiUrl: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-v4-flash',
    }
  }
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

// 统计汉字字符数（只算 CJK 字符）
function countHanzi(text: string): number {
  let count = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // CJK 统一表意文字：4E00-9FFF
    if (code >= 0x4E00 && code <= 0x9FFF) count++
  }
  return count
}

// 在指定字数位置找到最近的句子结尾截断
function truncateToSentence(text: string, maxHanzi: number): string {
  const count = countHanzi(text)
  if (count <= maxHanzi) return text

  let hanziCount = 0
  let lastBreak = 0
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code >= 0x4E00 && code <= 0x9FFF) {
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

type SectionKey = 'content' | 'feelings' | 'other'

interface ParsedSections {
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

function parseSections(raw: string): ParsedSections {
  // 预处理：去掉 markdown 装饰符号，保留文本内容
  const text = raw
    .replace(/^\s*#{1,6}\s*/gm, '')       // 行首 ### 标题符
    .replace(/\*\*(.+?)\*\*/g, '$1')      // **加粗**
    .replace(/__(.+?)__/g, '$1')          // __加粗__
    .replace(/^\s*[-*]\s+/gm, '')         // 行首列表符

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

  const foundCount =
    (result.content ? 1 : 0) + (result.feelings ? 1 : 0) + (result.other ? 1 : 0)
  result.valid = Boolean(result.content) && foundCount >= 2
  return result
}

// 解析结果质量评分（用于两次生成结果择优）
function sectionScore(p: ParsedSections): number {
  if (!p.valid) return 0
  return countHanzi(p.content) + countHanzi(p.feelings) + countHanzi(p.other)
}

// 降级清理：去掉残留标记符号，输出纯文本
function stripMarkers(text: string): string {
  return text
    .replace(/={2,}\s*[^=\n]{1,12}\s*={2,}/g, ' ')
    .replace(/【[^】\n]{1,12}】/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ============================================================
// Prompt 构建（System 放规则，User 放内容）
// ============================================================

const SYSTEM_PROMPT = `你是中国计量大学质量管理工程专业大三学生，正在企业实习，写企业实践日记。
规则：
- 语言通顺成熟即可，不必精雕细琢；第一人称"我"，贴合当天实际场景和实习岗位
- 严格按用户要求的格式和字数输出，不输出任何解释、说明或多余内容
- 不用"通过这次实习""综上所述""受益匪浅"等套话
- 生成内容要符合用户指定的实习岗位（如PQE写质量管控相关，PE写工艺设备相关，各岗位侧重点不同）`

function buildPrompt(input: DiaryFormInput): string {
  return `根据今天的实习记录写企业实践日记（实习内容约150-200字，体会约150-200字，其他约80-120字）。

【实习岗位】${input.position || '实习生'}
【日期】${input.date || ''}

【草稿：实习内容】
${input.content}

【草稿：实习体会和感受】
${input.feelings}

【草稿：其他】
${input.other}

按以下格式输出：

===实习内容===
（重写为正式实习内容）

===实习体会和感受===
（重写为正式体会）

===其他===
（简洁补充）`
}

// ============================================================
// API 调用
// ============================================================

// 禁用思考参数探测结果（模块级缓存：undefined=未知, true=网关支持, false=不支持）
let noThinkSupported: boolean | undefined = undefined

// 底层请求：发送完整 body，返回正文内容
async function postChat(config: AIConfig, body: Record<string, unknown>): Promise<string> {
  // 90 秒超时保护（推理模型思考较久）
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90000)

  let response: Response
  try {
    response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (e: unknown) {
    clearTimeout(timeout)
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('生成超时（90秒），请检查网络后重试。')
    }
    throw new Error('网络连接失败，请检查网络后重试。（' + (e instanceof Error ? e.message : String(e)) + '）')
  }
  clearTimeout(timeout)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[AI] API error:', response.status, errorText)
    let friendlyMsg = `AI生成失败（HTTP ${response.status}），请稍后重试。`
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.error?.message) {
        friendlyMsg = `AI生成失败：${parsed.error.message}`
      }
    } catch {
      if (errorText) friendlyMsg = `AI生成失败（HTTP ${response.status}）：${errorText.slice(0, 200)}`
    }
    const err = new Error(friendlyMsg) as Error & { httpStatus?: number }
    err.httpStatus = response.status
    throw err
  }

  const data = await response.json()
  const choice = data.choices?.[0]
  const msg = choice?.message
  const content = msg?.content
  if (!content || !String(content).trim()) {
    // 响应结构诊断（脱敏摘要，帮助定位问题）
    const diagnosis = {
      finish: choice?.finish_reason || '(无)',
      fields: msg ? Object.keys(msg).join('/') : '(无message)',
      contentLen: (content || '').length,
      reasoningLen: String(msg?.reasoning_content || '').length,
    }
    console.error('[AI] 响应为空:', JSON.stringify(data).slice(0, 800))
    const err = new Error(
      `AI 返回了空内容。诊断信息：finish=${diagnosis.finish}，字段=${diagnosis.fields}，内容长度=${diagnosis.contentLen}，思考长度=${diagnosis.reasoningLen}。请把这条信息截图给开发者。`
    )
    err.name = 'EmptyContentError'
    throw err
  }

  return String(content)
}

// 通用 API 调用：自动附加"禁用思考"参数以节省成本；网关不支持时自动回退重试
async function callAPI(config: AIConfig, userPrompt: string, maxTokens: number, temperature: number): Promise<string> {
  const baseBody: Record<string, unknown> = {
    model: config.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  }

  // 尝试禁用思考（若网关支持，将显著提速并降低费用）
  if (noThinkSupported !== false) {
    try {
      const result = await postChat(config, {
        ...baseBody,
        thinking: { type: 'disabled' },
        enable_thinking: false,
      })
      noThinkSupported = true
      return result
    } catch (e) {
      const status = (e as { httpStatus?: number }).httpStatus
      if (status === 400 || status === 422) {
        console.warn('[AI] 网关不接受禁用思考参数，已自动回退（将继续使用推理模式）')
        noThinkSupported = false
      } else {
        throw e
      }
    }
  }

  return postChat(config, baseBody)
}

async function callAI(config: AIConfig, input: DiaryFormInput, retryHint = ''): Promise<string> {
  return callAPI(config, buildPrompt(input) + retryHint, 4000, retryHint ? 0.8 : 0.7)
}

// 逐段生成：每次只生成一个栏目（任务小、思考短，不会耗尽预算）
async function generateBySections(config: AIConfig, input: DiaryFormInput): Promise<AIGeneratedResult> {
  console.log('[AI] 切换逐段生成模式')
  const defs: { key: 'content' | 'feelings' | 'other'; label: string; target: string; max: number }[] = [
    { key: 'content', label: '实习内容', target: '约150-200字', max: 200 },
    { key: 'feelings', label: '实习体会和感受', target: '约150-200字', max: 200 },
    { key: 'other', label: '其他', target: '约80-120字', max: 120 },
  ]

  const result: AIGeneratedResult = { content: '', feelings: '', other: '' }

  for (const def of defs) {
    try {
      const prompt = `根据今天的实习记录草稿，写企业实践日记中【${def.label}】一栏的内容（${def.target}）。

实习岗位：${input.position || '实习生'}

今天草稿：
- 实习内容：${input.content || '（无）'}
- 实习体会：${input.feelings || '（无）'}
- 其他：${input.other || '（无）'}

只输出这一栏的正文，不要标题、标记或解释。`
      const raw = await callAPI(config, prompt, 4000, 0.7)
      result[def.key] = truncateToSentence(stripMarkers(raw), def.max)
      console.log(`[AI] ${def.label} 生成成功:`, countHanzi(result[def.key]), '字')
    } catch (e) {
      console.warn(`[AI] ${def.label} 逐段生成失败`, e)
    }
  }

  // 三栏全空才算彻底失败
  if (!result.content.trim() && !result.feelings.trim() && !result.other.trim()) {
    throw new Error('AI 生成失败（逐段模式也不可用），请稍后重试。')
  }
  return result
}

// ============================================================
// 主流程：生成 → 解析 → 不达标重试 → 逐段兜底 → 智能降级
// ============================================================

export async function generateDiaryContent(input: DiaryFormInput): Promise<AIGeneratedResult> {
  const config = getAIConfig()
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  // 主路径：一次生成全文；推理预算耗尽（空内容）时自动切换逐段模式
  let text1 = ''
  try {
    text1 = await callAI(config, input)
  } catch (e: unknown) {
    const isEmpty = e instanceof Error && (e.name === 'EmptyContentError' || e.message.includes('空内容'))
    if (isEmpty) {
      console.warn('[AI] 整篇生成空内容（推理预算耗尽），切换逐段生成')
      return await generateBySections(config, input)
    }
    throw e
  }
  let parsed = parseSections(text1)
  let bestText = text1 // 降级路径使用的原文

  // 解析失败或内容明显不足 → 重试一次
  if (!parsed.valid || countHanzi(parsed.content) < 80) {
    console.log('[AI] 首次结果不达标（valid:', parsed.valid, '字符:', countHanzi(parsed.content), '），重试…')
    try {
      const text2 = await callAI(
        config,
        input,
        '\n\n（上一轮回答格式或长度不符合要求。请严格按 ===实习内容=== 、===实习体会和感受=== 、===其他=== 三个标记分段输出，每段 150+ 汉字，不要输出任何额外说明。）'
      )
      const parsed2 = parseSections(text2)
      // 两次结果择优
      if (parsed2.valid && sectionScore(parsed2) >= sectionScore(parsed)) {
        parsed = parsed2
        bestText = text2
      } else if (!parsed.valid && stripMarkers(text2).length > stripMarkers(text1).length) {
        // 两次都未按格式输出时，保留内容更完整的文本用于降级
        bestText = text2
      }
    } catch (e) {
      console.warn('[AI] 重试失败，使用首次结果', e)
    }
  }

  // 最终降级：两次解析都失败 → 全文归入实习内容（避免三栏重复显示）
  if (!parsed.valid) {
    console.warn('[AI] 两次解析均失败，走降级路径')
    const fallbackContent = truncateToSentence(stripMarkers(bestText), 200)
    if (!fallbackContent.trim()) {
      throw new Error('AI 生成结果为空，请稍后重试。')
    }
    return {
      content: fallbackContent,
      feelings: '',
      other: '',
    }
  }

  const content = truncateToSentence(parsed.content, 200)
  const feelings = truncateToSentence(parsed.feelings, 200)
  const other = truncateToSentence(parsed.other, 120)

  console.log('[AI] 字数: 实习内容', countHanzi(content), '| 体会', countHanzi(feelings), '| 其他', countHanzi(other))

  return { content, feelings, other }
}

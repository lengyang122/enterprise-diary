import type { DiaryFormInput, AIGeneratedResult } from '../types'
import {
  countHanzi,
  truncateToSentence,
  parseSections,
  sectionScore,
  stripMarkers,
  shortSections,
  SECTION_TARGETS,
  type SectionKey,
  type SectionTarget,
} from './text'
import { getAIConfig, type AIConfig } from './aiConfig'

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

// ============================================================
// 连接自检 —— 用一个最小请求验证 API Key / 地址 / 模型是否可用
// 与生成流程分开，便于把「配置问题」和「生成质量问题」区分开
// ============================================================

export interface ConnectionTestResult {
  ok: boolean
  message: string
  latencyMs?: number
}

export async function testAIConnection(config: AIConfig): Promise<ConnectionTestResult> {
  if (!config.apiKey) {
    return { ok: false, message: '请先填写 API Key' }
  }
  if (!config.apiUrl) {
    return { ok: false, message: '请先填写 API 地址' }
  }

  const started = Date.now()
  try {
    const reply = await postChat(config, {
      model: config.model,
      messages: [{ role: 'user', content: '回复 ok' }],
      max_tokens: 16,
      temperature: 0,
    })
    const latencyMs = Date.now() - started
    const preview = reply.trim().replace(/\s+/g, ' ').slice(0, 20) || '(空)'
    return {
      ok: true,
      latencyMs,
      message: `连接正常 · 用时 ${latencyMs}ms · 模型 ${config.model} · 返回「${preview}」`,
    }
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) }
  }
}

// ---- 单栏生成 ----

function sectionPrompt(def: SectionTarget, input: DiaryFormInput, extra = ''): string {
  return `根据今天的实习记录草稿，写企业实践日记中【${def.label}】一栏的内容（${def.min}-${def.max} 字，按汉字计，不得少于 ${def.min} 字）。

实习岗位：${input.position || '实习生'}

今天草稿：
- 实习内容：${input.content || '（无）'}
- 实习体会：${input.feelings || '（无）'}
- 其他：${input.other || '（无）'}

只输出这一栏的正文，不要标题、标记或解释。${extra}`
}

async function generateOneSection(
  config: AIConfig,
  input: DiaryFormInput,
  def: SectionTarget,
  extra = ''
): Promise<string> {
  const raw = await callAPI(config, sectionPrompt(def, input, extra), 4000, 0.7)
  return truncateToSentence(stripMarkers(raw), def.max)
}

// 逐段生成：每次只生成一个栏目（任务小、思考短，不会耗尽预算）
async function generateBySections(
  config: AIConfig,
  input: DiaryFormInput
): Promise<AIGeneratedResult> {
  console.log('[AI] 切换逐段生成模式')
  const result: AIGeneratedResult = { content: '', feelings: '', other: '' }

  for (const def of SECTION_TARGETS) {
    try {
      result[def.key] = await generateOneSection(config, input, def)
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

// 偏短栏目补写一次（每栏最多一次，避免请求量失控）
async function topUpShortSections(
  config: AIConfig,
  input: DiaryFormInput,
  result: AIGeneratedResult
): Promise<AIGeneratedResult> {
  const short = shortSections(result)
  if (!short.length) return result

  const out: AIGeneratedResult = { ...result }

  for (const q of short) {
    console.log(`[AI] ${q.label} 仅 ${q.count} 字（目标 ${q.min}-${q.max}），补写一次`)
    try {
      const rewritten = await generateOneSection(
        config,
        input,
        q,
        `\n\n注意：上一版只有 ${q.count} 字，太短。请务必写满 ${q.min}-${q.max} 字，补充具体细节。`
      )
      // 只在确实变长时采用，避免越补越短
      if (countHanzi(rewritten) > q.count) {
        out[q.key] = rewritten
      }
    } catch (e) {
      console.warn(`[AI] ${q.label} 补写失败，保留原内容`, e)
    }
  }

  return out
}

// 供界面调用的单栏重生成
export async function regenerateSection(
  key: SectionKey,
  input: DiaryFormInput,
  current = ''
): Promise<string> {
  const config = getAIConfig()
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  const def = SECTION_TARGETS.find(t => t.key === key)
  if (!def) {
    throw new Error(`未知栏目：${key}`)
  }

  return generateOneSection(
    config,
    input,
    def,
    current ? '\n\n注意：换一种写法，不要与上一版雷同。' : ''
  )
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
      return await topUpShortSections(config, input, await generateBySections(config, input))
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
    return await topUpShortSections(config, input, {
      content: fallbackContent,
      feelings: '',
      other: '',
    })
  }

  const content = truncateToSentence(parsed.content, 200)
  const feelings = truncateToSentence(parsed.feelings, 200)
  const other = truncateToSentence(parsed.other, 120)

  const result = await topUpShortSections(config, input, { content, feelings, other })

  console.log(
    '[AI] 最终字数: 实习内容',
    countHanzi(result.content),
    '| 体会',
    countHanzi(result.feelings),
    '| 其他',
    countHanzi(result.other)
  )

  return result
}

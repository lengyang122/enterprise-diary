import type { DiaryFormInput, AIGeneratedResult } from '../types'

// AI API 配置（用户可在页面设置中修改）
const AI_CONFIG_KEY = 'enterprise-diary-ai-config'

export interface AIConfig {
  apiKey: string
  apiUrl: string
  model: string
}

export function getAIConfig(): AIConfig {
  const stored = localStorage.getItem(AI_CONFIG_KEY)
  if (stored) return JSON.parse(stored)
  return {
    apiKey: '',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  }
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

// 构建 AI 提示词
function buildPrompt(input: DiaryFormInput): string {
  return `你是中国计量大学质量管理工程专业的一名PQE实习生。请根据以下当天的实习记录，按照企业实践日记的要求，帮我撰写正式的实习日记内容。

要求：
- 语言正式、专业
- 实习内容要具体、有细节
- 实习体会和感受要有深度
- 其他可以补充当天的质量思考或感悟

【今日工作】
${input.today_work}

【学习内容】
${input.learn_content}

【发现问题】
${input.problems}

【思考】
${input.thinking}

请按以下格式输出（不要有多余内容）：

===实习内容===
（将今日工作和学习内容整合成一段通顺的实习内容描述，300-500字）

===实习体会和感受===
（结合发现的问题和思考，写出实习体会，200-300字）

===其他===
（补充当天的质量感悟或其他想记录的内容，100-200字）`
}

// 调用 AI API（兼容 OpenAI 格式）
export async function generateDiaryContent(input: DiaryFormInput): Promise<AIGeneratedResult> {
  const config = getAIConfig()
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 AI API Key')
  }

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'user', content: buildPrompt(input) },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`AI API 调用失败: ${error}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  // 解析输出
  const content = extractSection(text, '实习内容')
  const feelings = extractSection(text, '实习体会和感受')
  const other = extractSection(text, '其他')

  return {
    content: content || '（AI 生成失败，请重试）',
    feelings: feelings || '（AI 生成失败，请重试）',
    other: other || '（AI 生成失败，请重试）',
  }
}

// 提取标记段落
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`===${sectionName}===\\s*([\\s\\S]*?)(?=\\n===|$)`)
  const match = text.match(regex)
  if (match) return match[1].trim()
  
  // 兼容无标记格式
  const lines = text.split('\n').filter(l => l.trim())
  return lines.join('\n')
}

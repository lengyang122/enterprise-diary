// ============================================================
// AI 接口配置 — 由使用者在设置页填写，仅存本地
// 独立成模块，便于备份层与 ai.ts 共用，避免重复实现
// ============================================================

export interface AIConfig {
  apiKey: string
  apiUrl: string
  model: string
}

const AI_CONFIG_KEY = 'enterprise-diary-ai-config'

export const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-v4-flash',
}

export function getAIConfig(): AIConfig {
  try {
    const stored = localStorage.getItem(AI_CONFIG_KEY)
    if (!stored) return { ...DEFAULT_AI_CONFIG }
    const data = JSON.parse(stored)
    return {
      apiKey: data.apiKey || '',
      apiUrl: data.apiUrl || DEFAULT_AI_CONFIG.apiUrl,
      model: data.model || DEFAULT_AI_CONFIG.model,
    }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

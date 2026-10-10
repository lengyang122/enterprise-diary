// ============================================================
// 生成管线测试 —— mock fetch，覆盖主路径 / 补写 / 逐段兜底 / 降级
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateDiaryContent, regenerateSection, testAIConnection } from './ai'
import { saveAIConfig, DEFAULT_AI_CONFIG } from './aiConfig'
import { countHanzi } from './text'
import type { DiaryFormInput } from '../types'

const hanzi = (n: number) => '质'.repeat(n)

const input: DiaryFormInput = {
  date: '9月2日',
  position: 'PQE',
  content: '参加了异常分析会议',
  feelings: '理解了5Why',
  other: '',
}

function chatResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response
}

function sectionText(content: string, feelings: string, other: string) {
  return `===实习内容===\n${content}\n===实习体会和感受===\n${feelings}\n===其他===\n${other}`
}

describe('generateDiaryContent', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    saveAIConfig({ ...DEFAULT_AI_CONFIG, apiKey: 'sk-test' })
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('未配置 API Key 时直接报错', async () => {
    localStorage.clear()
    await expect(generateDiaryContent(input)).rejects.toThrow('API Key')
  })

  it('一次生成且字数达标时不再补写', async () => {
    fetchMock.mockResolvedValue(chatResponse(sectionText(hanzi(170), hanzi(170), hanzi(100))))

    const r = await generateDiaryContent(input)

    expect(countHanzi(r.content)).toBe(170)
    expect(countHanzi(r.feelings)).toBe(170)
    expect(countHanzi(r.other)).toBe(100)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('栏目偏短时自动补写一次并采用更长的版本', async () => {
    // 首轮：正文与体会各 100 字（低于 150），其他 100 字（达标）
    // 正文 100 >= 80，所以不会触发整篇重试，只会触发补写
    fetchMock.mockResolvedValueOnce(chatResponse(sectionText(hanzi(100), hanzi(100), hanzi(100))))
    fetchMock.mockResolvedValue(chatResponse(hanzi(170)))

    const r = await generateDiaryContent(input)

    expect(fetchMock).toHaveBeenCalledTimes(3) // 1 次整篇 + 2 次补写
    expect(countHanzi(r.content)).toBe(170)
    expect(countHanzi(r.feelings)).toBe(170)
    expect(countHanzi(r.other)).toBe(100)
  })

  it('补写结果反而更短时保留原内容', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse(sectionText(hanzi(100), hanzi(170), hanzi(100))))
    fetchMock.mockResolvedValue(chatResponse(hanzi(50)))

    const r = await generateDiaryContent(input)

    expect(fetchMock).toHaveBeenCalledTimes(2) // 只有正文需要补写
    expect(countHanzi(r.content)).toBe(100)
  })

  it('整篇返回空内容时切换逐段生成', async () => {
    fetchMock.mockResolvedValueOnce(chatResponse(''))
    fetchMock.mockResolvedValue(chatResponse(hanzi(170)))

    const r = await generateDiaryContent(input)

    expect(fetchMock).toHaveBeenCalledTimes(4) // 1 次空响应 + 逐段 3 次
    expect(countHanzi(r.content)).toBe(170)
    expect(countHanzi(r.feelings)).toBe(170)
  })

  it('两次解析都失败时降级为全文归入实习内容', async () => {
    fetchMock.mockResolvedValue(chatResponse(hanzi(180)))

    const r = await generateDiaryContent(input)

    expect(fetchMock).toHaveBeenCalledTimes(2) // 首次 + 一次重试
    expect(r.feelings).toBe('')
    expect(r.other).toBe('')
    expect(countHanzi(r.content)).toBe(180)
  })

  it('HTTP 错误会带上友好提示并抛出', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'invalid api key' } }),
    } as unknown as Response)

    await expect(generateDiaryContent(input)).rejects.toThrow('invalid api key')
  })
})

describe('regenerateSection', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    saveAIConfig({ ...DEFAULT_AI_CONFIG, apiKey: 'sk-test' })
    fetchMock = vi.fn().mockResolvedValue(chatResponse(hanzi(170)))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('只重生成指定栏目', async () => {
    const text = await regenerateSection('feelings', input, hanzi(100))
    expect(countHanzi(text)).toBe(170)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('未知栏目直接报错，不发起请求', async () => {
    await expect(regenerateSection('nope' as never, input)).rejects.toThrow('未知栏目')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('未配置 API Key 时报错', async () => {
    localStorage.clear()
    await expect(regenerateSection('content', input)).rejects.toThrow('API Key')
  })
})

describe('testAIConnection', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => vi.unstubAllGlobals())

  const cfg = (over: Record<string, string> = {}) => ({
    ...DEFAULT_AI_CONFIG,
    apiKey: 'sk-test',
    ...over,
  })

  it('未填 API Key 时不发请求', async () => {
    const r = await testAIConnection(cfg({ apiKey: '' }))
    expect(r.ok).toBe(false)
    expect(r.message).toContain('API Key')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('未填 API 地址时不发请求', async () => {
    const r = await testAIConnection(cfg({ apiUrl: '' }))
    expect(r.ok).toBe(false)
    expect(r.message).toContain('API 地址')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('成功时回报耗时与模型', async () => {
    fetchMock.mockResolvedValue(chatResponse('ok'))
    const r = await testAIConnection(cfg({ model: 'my-model' }))
    expect(r.ok).toBe(true)
    expect(r.message).toContain('连接正常')
    expect(r.message).toContain('my-model')
    expect(typeof r.latencyMs).toBe('number')
  })

  it('鉴权失败时回报网关给出的原因', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ error: { message: 'invalid api key' } }),
    } as unknown as Response)

    const r = await testAIConnection(cfg())
    expect(r.ok).toBe(false)
    expect(r.message).toContain('invalid api key')
  })

  it('网络异常时回报可读错误而不是抛出', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'))
    const r = await testAIConnection(cfg())
    expect(r.ok).toBe(false)
    expect(r.message).toContain('网络连接失败')
  })
})

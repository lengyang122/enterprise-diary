import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import SettingsPage from './SettingsPage'
import { testAIConnection } from '../lib/ai'

vi.mock('../lib/ai', () => ({ testAIConnection: vi.fn() }))

describe('SettingsPage 连接自检', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(testAIConnection).mockReset()
  })
  afterEach(() => cleanup())

  it('测试成功后显示结果', async () => {
    vi.mocked(testAIConnection).mockResolvedValue({
      ok: true,
      message: '连接正常 · 用时 120ms · 模型 my-model · 返回「ok」',
      latencyMs: 120,
    })

    render(<SettingsPage />)
    fireEvent.click(await screen.findByText('测试连接'))

    expect(await screen.findByText(/连接正常/)).toBeTruthy()
  })

  it('测试失败后显示错误原因', async () => {
    vi.mocked(testAIConnection).mockResolvedValue({
      ok: false,
      message: 'AI生成失败：invalid api key',
    })

    render(<SettingsPage />)
    fireEvent.click(await screen.findByText('测试连接'))

    expect(await screen.findByText(/invalid api key/)).toBeTruthy()
  })

  it('测试前会把当前配置落盘，避免测到旧值', async () => {
    vi.mocked(testAIConnection).mockResolvedValue({ ok: true, message: '连接正常' })

    render(<SettingsPage />)
    const keyInput = await screen.findByPlaceholderText('sk-...')
    fireEvent.change(keyInput, { target: { value: 'sk-just-typed' } })
    fireEvent.click(screen.getByText('测试连接'))

    await screen.findByText('连接正常')
    const saved = JSON.parse(localStorage.getItem('enterprise-diary-ai-config')!)
    expect(saved.apiKey).toBe('sk-just-typed')
  })
})

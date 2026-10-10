import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import DiaryCreatePage from './DiaryCreatePage'

// 隔离 AI 与 Word 依赖：本文件只验证草稿与渲染行为
vi.mock('../lib/ai', () => ({ generateDiaryContent: vi.fn() }))
vi.mock('../lib/word', () => ({ downloadWord: vi.fn() }))

const draftKey = 'enterprise-diary-draft'

describe('DiaryCreatePage 草稿行为', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('渲染三个草稿输入区', async () => {
    render(<DiaryCreatePage />)
    expect(await screen.findByText('今天发生了什么？')).toBeTruthy()
    expect(screen.getByText('今天有什么收获？')).toBeTruthy()
    expect(screen.getByText('还有什么想留下？')).toBeTruthy()
  })

  it('无草稿时不显示恢复提示', async () => {
    render(<DiaryCreatePage />)
    await screen.findByText('今天发生了什么？')
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })

  it('挂载时恢复未提交的草稿并给出提示', async () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        form: { date: '8月9日', position: 'PE', content: '上次写到一半', feelings: '', other: '' },
        aiResult: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    )

    render(<DiaryCreatePage />)

    expect(await screen.findByText('已恢复上次未完成的草稿')).toBeTruthy()
    const textarea = screen.getByPlaceholderText(/记录几个关键词就好/) as HTMLTextAreaElement
    expect(textarea.value).toBe('上次写到一半')
  })

  it('恢复的草稿不会在挂载瞬间被空表单覆盖', async () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        form: { date: '8月9日', position: 'PE', content: '重要内容', feelings: '', other: '' },
        aiResult: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    )

    render(<DiaryCreatePage />)
    await screen.findByText('已恢复上次未完成的草稿')

    // 等待超过防抖窗口，草稿内容必须仍在
    await new Promise(r => setTimeout(r, 800))
    const saved = JSON.parse(localStorage.getItem(draftKey)!)
    expect(saved.form.content).toBe('重要内容')
  })

  it('输入后自动写入草稿', async () => {
    render(<DiaryCreatePage />)
    const textarea = await screen.findByPlaceholderText(/记录几个关键词就好/)

    fireEvent.change(textarea, { target: { value: '今天参加了异常分析会议' } })

    await waitFor(
      () => {
        const raw = localStorage.getItem(draftKey)
        expect(raw).toBeTruthy()
        expect(JSON.parse(raw!).form.content).toBe('今天参加了异常分析会议')
      },
      { timeout: 3000 }
    )
  })

  it('恢复提示可关闭', async () => {
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        form: { date: '8月9日', position: 'PE', content: '内容', feelings: '', other: '' },
        aiResult: null,
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    )

    render(<DiaryCreatePage />)
    fireEvent.click(await screen.findByText('知道了'))
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })
})

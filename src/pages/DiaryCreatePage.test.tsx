import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import DiaryCreatePage from './DiaryCreatePage'
import { downloadWord } from '../lib/word'
import { EMPTY_PROFILE } from '../lib/storage'

// 隔离 AI 依赖；word 只替换下载动作，保留 checkExportData / describeExportCheck 的真实实现
vi.mock('../lib/ai', () => ({ generateDiaryContent: vi.fn() }))
vi.mock('../lib/word', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/word')>()
  return { ...actual, downloadWord: vi.fn() }
})

const draftKey = 'enterprise-diary-draft'
const profileKey = 'enterprise-diary-profile'

function seedDraft(content: string, withResult = false) {
  localStorage.setItem(
    draftKey,
    JSON.stringify({
      form: { date: '9月2日', position: 'PE', content, feelings: '', other: '' },
      aiResult: withResult
        ? { content: '整理后的实习内容。', feelings: '整理后的体会。', other: '' }
        : null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
  )
}

function seedProfile() {
  localStorage.setItem(profileKey, JSON.stringify({ ...EMPTY_PROFILE, name: '张三', company: '某公司' }))
}

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
    seedDraft('上次写到一半')

    render(<DiaryCreatePage />)

    expect(await screen.findByText('已恢复上次未完成的草稿')).toBeTruthy()
    const textarea = screen.getByPlaceholderText(/记录几个关键词就好/) as HTMLTextAreaElement
    expect(textarea.value).toBe('上次写到一半')
  })

  it('恢复的草稿不会在挂载瞬间被空表单覆盖', async () => {
    seedDraft('重要内容')

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
    seedDraft('内容')

    render(<DiaryCreatePage />)
    fireEvent.click(await screen.findByText('知道了'))
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })
})

describe('DiaryCreatePage 导出行为', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(downloadWord).mockReset()
    vi.restoreAllMocks()
  })
  afterEach(() => cleanup())

  it('模板失配时在页面上显式报错，而不是静默下载错误内容', async () => {
    seedProfile()
    seedDraft('今天在产线跟进异常。', true)
    vi.mocked(downloadWord).mockRejectedValue(
      new Error('导出失败：内置模板中找不到以下内容的位置 —— 姓名。')
    )
    ;(globalThis as unknown as { confirm: unknown }).confirm = vi.fn(() => true)

    render(<DiaryCreatePage />)
    await screen.findByText('下载 Word')

    await waitFor(() => {
      fireEvent.click(screen.getByText('下载 Word'))
      expect(downloadWord).toHaveBeenCalled()
    })

    expect(await screen.findByText('导出失败')).toBeTruthy()
    expect(screen.getByText(/找不到以下内容的位置/)).toBeTruthy()
  })

  it('个人信息缺失时先提示，选择取消则不导出', async () => {
    // 只填姓名，其余个人信息为空
    localStorage.setItem(profileKey, JSON.stringify({ ...EMPTY_PROFILE, name: '张三' }))
    seedDraft('今天在产线跟进异常。', true)
    const confirmMock = vi.fn(() => false)
    ;(globalThis as unknown as { confirm: unknown }).confirm = confirmMock

    render(<DiaryCreatePage />)
    await screen.findByText('下载 Word')

    await waitFor(() => {
      fireEvent.click(screen.getByText('下载 Word'))
      expect(confirmMock).toHaveBeenCalled()
    })

    expect(downloadWord).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import DiaryCreatePage from './DiaryCreatePage'
import { downloadWord } from '../lib/word'
import { EMPTY_PROFILE } from '../lib/storage'
import { QUOTES } from '../lib/quotes'

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

  it('输入态只有一个自由输入框 —— 改版的目标就是「干净」', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    const textareas = document.querySelectorAll('textarea')
    expect(textareas).toHaveLength(1)
    // 日期与岗位仍在，只是并进了这张卡里
    expect(screen.getByTitle('点击选择日期')).toBeTruthy()
    expect(screen.getByTitle('点击选择岗位')).toBeTruthy()
  })

  it('无草稿时不显示恢复提示', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })

  it('挂载时恢复未提交的草稿并给出提示', async () => {
    seedDraft('上次写到一半')

    render(<DiaryCreatePage />)

    expect(await screen.findByText('已恢复上次未完成的草稿')).toBeTruthy()
    const textarea = screen.getByPlaceholderText(/今天发生了什么？/) as HTMLTextAreaElement
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
    const textarea = await screen.findByPlaceholderText(/今天发生了什么？/)

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

  it('恢复提示可手动关闭', async () => {
    seedDraft('内容')

    render(<DiaryCreatePage />)
    expect(await screen.findByText('已恢复上次未完成的草稿')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('关闭'))
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })
})

describe('DiaryCreatePage 顶部文案', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('顶部展示随机文案与出处', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    const shown = QUOTES.filter(q => screen.queryByText(q.text))
    expect(shown).toHaveLength(1)
    expect(screen.getByText(`— ${shown[0].author}`)).toBeTruthy()
  })

  it('点「换一句」会换成另一条', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    const before = QUOTES.find(q => screen.queryByText(q.text))!
    fireEvent.click(screen.getByLabelText('换一句'))
    const after = QUOTES.find(q => screen.queryByText(q.text))!

    expect(after.text).not.toBe(before.text)
  })

  it('没有草稿时不显示恢复提示', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)
    expect(screen.queryByText('已恢复上次未完成的草稿')).toBeNull()
  })
})

describe('DiaryCreatePage 日期选择器', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('点击日期胶囊打开的是日期选择器，而不是文本输入框', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择日期'))

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement | null
    expect(dateInput).toBeTruthy()
    // 不应再有可自由输入的文本框（文本输入才是用户抱怨的点）
    expect(document.querySelector('input[type="text"][class*="w-24"]')).toBeNull()
  })

  it('日期在「9月3日」与选择器的 YYYY-MM-DD 之间双向转换，落库格式不变', async () => {
    seedDraft('今天的内容')
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择日期'))
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    // 存储里是「9月2日」（见 seedDraft），选择器要收到同一天的 ISO 值
    expect(dateInput.value).toMatch(/^\d{4}-09-02$/)

    fireEvent.change(dateInput, { target: { value: '2026-10-15' } })

    // 胶囊改回展示格式，说明反向转换也正确
    expect(screen.getByTitle('点击选择日期').textContent).toBe('10月15日')
  })
})

describe('DiaryCreatePage 岗位选择器', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('点击岗位胶囊打开自绘下拉并列出全部预设', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))

    expect(screen.getByPlaceholderText('输入或选择岗位')).toBeTruthy()
    expect(screen.getByText('SQE')).toBeTruthy()
    expect(screen.getByText('工艺工程师')).toBeTruthy()
  })

  it('不使用原生 datalist（弹出层必须可控）', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))

    expect(document.querySelector('datalist')).toBeNull()
    expect(document.querySelector('option')).toBeNull()
  })

  it('选择预设后写入胶囊并关闭下拉', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))
    fireEvent.click(screen.getByText('SQE'))

    expect(screen.queryByPlaceholderText('输入或选择岗位')).toBeNull()
    expect(screen.getByTitle('点击选择岗位').textContent).toBe('SQE')
  })

  it('输入自定义岗位后回车即可使用', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))
    const input = screen.getByPlaceholderText('输入或选择岗位')
    fireEvent.change(input, { target: { value: '可靠性工程师' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(screen.getByTitle('点击选择岗位').textContent).toBe('可靠性工程师')
  })

  it('输入关键词会筛选预设', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))
    fireEvent.change(screen.getByPlaceholderText('输入或选择岗位'), { target: { value: '工程' } })

    expect(screen.getByText('工艺工程师')).toBeTruthy()
    expect(screen.getByText('设备工程师')).toBeTruthy()
    expect(screen.queryByText('SQE')).toBeNull()
  })

  it('按 Esc 关闭下拉且不改动岗位', async () => {
    render(<DiaryCreatePage />)
    await screen.findByPlaceholderText(/今天发生了什么？/)

    fireEvent.click(screen.getByTitle('点击选择岗位'))
    expect(screen.getByPlaceholderText('输入或选择岗位')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByPlaceholderText('输入或选择岗位')).toBeNull()
    expect(screen.getByTitle('点击选择岗位').textContent).toBe('PQE')
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

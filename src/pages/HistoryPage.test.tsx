import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import HistoryPage from './HistoryPage'
import { downloadAllWords, downloadWord } from '../lib/word'
import { EMPTY_PROFILE } from '../lib/storage'
import type { DiaryEntry } from '../types'

vi.mock('../lib/word', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/word')>()
  return { ...actual, downloadWord: vi.fn(), downloadAllWords: vi.fn() }
})

const entriesKey = 'enterprise-diary-entries'
const profileKey = 'enterprise-diary-profile'

const entry = (id: string, date: string, content: string): DiaryEntry => ({
  id,
  date,
  position: 'PQE',
  content,
  feelings: '体会',
  other: '',
  created_at: '2026-01-01T00:00:00.000Z',
})

function seed(data: DiaryEntry[]) {
  localStorage.setItem(profileKey, JSON.stringify({ ...EMPTY_PROFILE, name: '张三' }))
  localStorage.setItem(entriesKey, JSON.stringify(data))
}

describe('HistoryPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(downloadAllWords).mockReset()
    vi.mocked(downloadWord).mockReset()
    vi.restoreAllMocks()
  })
  afterEach(() => cleanup())

  it('无记录时不显示「导出全部」', async () => {
    seed([])
    render(<HistoryPage />)
    await screen.findByText('还没有记录')
    expect(screen.queryByText('导出全部')).toBeNull()
  })

  it('有记录时显示篇数与「导出全部」', async () => {
    seed([entry('a', '9月2日', '内容A'), entry('b', '9月3日', '内容B')])
    render(<HistoryPage />)

    expect(await screen.findByText('2 篇记录')).toBeTruthy()
    expect(screen.getByText('导出全部')).toBeTruthy()
  })

  it('导出全部会打包所有日记', async () => {
    seed([entry('a', '9月2日', '内容A'), entry('b', '9月3日', '内容B')])
    vi.mocked(downloadAllWords).mockResolvedValue('全部.zip')

    render(<HistoryPage />)
    fireEvent.click(await screen.findByText('导出全部'))

    await waitFor(() => expect(downloadAllWords).toHaveBeenCalledTimes(1))
    const items = vi.mocked(downloadAllWords).mock.calls[0][0]
    expect(items).toHaveLength(2)
    expect(items[0].fileName).toContain('.docx')
  })

  it('批量导出失败时在页面上报错', async () => {
    seed([entry('a', '9月2日', '内容A')])
    vi.mocked(downloadAllWords).mockRejectedValue(new Error('导出失败：模板已变更'))

    render(<HistoryPage />)
    fireEvent.click(await screen.findByText('导出全部'))

    expect(await screen.findByText('导出失败')).toBeTruthy()
    expect(screen.getByText(/模板已变更/)).toBeTruthy()
  })

  it('单篇导出前会做信息缺失提示，取消则不导出', async () => {
    seed([entry('a', '9月2日', '内容A')])
    const confirmMock = vi.fn(() => false)
    ;(globalThis as unknown as { confirm: unknown }).confirm = confirmMock

    render(<HistoryPage />)
    fireEvent.click(await screen.findByText('内容A'))

    fireEvent.click(await screen.findByText('下载 Word'))

    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    expect(downloadWord).not.toHaveBeenCalled()
  })
})

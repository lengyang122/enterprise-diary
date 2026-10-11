import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WelcomePage from './WelcomePage'
import { hasEntered, getProfile } from '../lib/storage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <WelcomePage />
    </MemoryRouter>
  )
}

async function submitForm(name: string, position = '') {
  fireEvent.change(screen.getByPlaceholderText('比如：冷阳'), { target: { value: name } })
  if (position) {
    fireEvent.change(screen.getByPlaceholderText('比如：PQE 质量工程师'), {
      target: { value: position },
    })
  }
  // 注意用带空格的精确名：标签页是「登录」，提交按钮是「登 录」，正则会把两者都匹配上
  fireEvent.click(screen.getByRole('button', { name: '登 录' }))
}

describe('WelcomePage 假登录流程', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('初始是「登录」表单，问的是名字与岗位 —— 而不是账号密码', () => {
    renderPage()
    expect(screen.getByPlaceholderText('比如：冷阳')).toBeTruthy()
    expect(screen.getByPlaceholderText('比如：PQE 质量工程师')).toBeTruthy()
  })

  it('没有密码框 —— 这是刻意规避钓鱼特征的硬约束', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(0)
  })

  it('姓名为空时不能提交', () => {
    renderPage()
    const btn = screen.getByRole('button', { name: '登 录' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('提交后先进入「正在验证…」，再揭晓', async () => {
    renderPage()
    await submitForm('冷阳')

    expect(screen.getByText('正在验证…')).toBeTruthy()

    await act(async () => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.getByText('骗到你了 😄')).toBeTruthy()
  })

  it('揭晓页会把填的内容念出来，让人知道它真的被用上了', async () => {
    renderPage()
    await submitForm('冷阳', 'PQE')
    await act(async () => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.getByText(/「冷阳」/)).toBeTruthy()
    expect(screen.getByText(/「PQE」/)).toBeTruthy()
  })

  it('揭晓后点「开始记录」：写入个人资料 + 标记已进入 + 跳主页', async () => {
    renderPage()
    await submitForm('冷阳', 'PQE')
    await act(async () => {
      vi.advanceTimersByTime(1300)
    })

    fireEvent.click(screen.getByRole('button', { name: '开始记录' }))

    await waitFor(async () => {
      expect(hasEntered()).toBe(true)
    })
    const profile = await getProfile()
    expect(profile?.name).toBe('冷阳')
    expect(profile?.company).toBe('PQE')
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('「忘记密码」也通向揭晓 —— 反正没有密码可以忘', async () => {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('比如：冷阳'), { target: { value: '冷阳' } })
    fireEvent.click(screen.getByRole('button', { name: '忘记密码？' }))
    await act(async () => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.getByText('骗到你了 😄')).toBeTruthy()
  })
})

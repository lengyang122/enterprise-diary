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

// 提交按钮现在和「登录」标签页同名（真实登录页就是这样），
// 所以按 type="submit" 定位，而不是按可访问名
function submitBtn() {
  return document.querySelector('form button[type="submit"]') as HTMLButtonElement
}

async function submitForm(name: string, position = '') {
  fireEvent.change(screen.getByPlaceholderText(/比如：冷阳/), { target: { value: name } })
  if (position) {
    fireEvent.change(screen.getByPlaceholderText(/比如：PQE 质量工程师/), {
      target: { value: position },
    })
  }
  fireEvent.click(submitBtn())
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

  it('字段说明写在 placeholder 里，上方不再单列标签', () => {
    renderPage()
    expect(screen.getByPlaceholderText(/比如：冷阳/)).toBeTruthy()
    expect(screen.getByPlaceholderText(/实习岗位（可留空）/)).toBeTruthy()
    // 不再有「你的名字」这类独立标签
    expect(screen.queryByText('你的名字')).toBeNull()
    expect(screen.queryByText('实习岗位（可留空）')).toBeNull()
  })

  it('没有密码框 —— 这是刻意规避钓鱼特征的硬约束', () => {
    const { container } = renderPage()
    expect(container.querySelectorAll('input[type="password"]')).toHaveLength(0)
  })

  it('姓名为空时不能提交', () => {
    renderPage()
    expect(submitBtn().disabled).toBe(true)
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

    // 进入前会等一次「让正在进入…先画出来」的双 rAF（带 120ms 超时兜底），
    // 这里把假定时器推过去
    await act(async () => {
      vi.advanceTimersByTime(300)
    })

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
    fireEvent.change(screen.getByPlaceholderText(/比如：冷阳/), { target: { value: '冷阳' } })
    fireEvent.click(screen.getByRole('button', { name: '忘记密码？' }))
    await act(async () => {
      vi.advanceTimersByTime(1300)
    })
    expect(screen.getByText('骗到你了 😄')).toBeTruthy()
  })

  it('个人资料写入失败时仍必须进入主页 —— 绝不能把用户锁死在这一页', async () => {
    // 复现 iOS 隐私模式 / 配额满：localStorage.setItem 抛异常。
    // 曾经的写法会在这里中断：标记没落、navigate 没执行、
    // 按钮停在「正在进入…」并永久禁用。
    const orig = Storage.prototype.setItem
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === 'enterprise-diary-profile') throw new Error('QuotaExceededError')
      return orig.call(this, k, v)
    }

    try {
      renderPage()
      await submitForm('冷阳', 'PQE')
      await act(async () => {
        vi.advanceTimersByTime(1300)
      })

      fireEvent.click(screen.getByRole('button', { name: '开始记录' }))

      await act(async () => {
        vi.advanceTimersByTime(300)
      })

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
      })
      // 「已进入」标记必须先落下来，否则刷新又会退回进入页
      expect(hasEntered()).toBe(true)
    } finally {
      Storage.prototype.setItem = orig
    }
  })
})

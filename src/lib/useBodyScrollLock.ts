// 浮层展开时锁住页面滚动
//
// 不锁的话滚轮会穿过浮层去滚身后的页面 —— 尤其是浮层自身没有可滚区域时，
// 滚轮事件会一路冒泡到文档，把背景整页滚走。
// 抽屉与历史详情弹窗共用这一份，避免以后新增浮层时又漏掉。
import { useEffect } from 'react'

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

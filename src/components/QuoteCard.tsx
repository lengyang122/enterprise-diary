import { useState } from 'react'
import { randomQuote, type Quote } from '../lib/quotes'
import { RefreshIcon } from './icons'

// 首页顶部的随机文案：每次进入随机一条，「换一句」换下一条（不会重复当前这条）。
// 另外承载一次性的草稿恢复提示。
//
// 改版后不再是一张玻璃卡 —— 输入态要「只有一个框」，
// 文案改为纯文字居中，安静地待在上方，也让背景动效更完整地露出来。
export default function QuoteCard({
  notice,
  onDismissNotice,
}: {
  notice?: string
  onDismissNotice?: () => void
}) {
  const [quote, setQuote] = useState<Quote>(() => randomQuote())

  return (
    <div className="text-center mb-7 text-static">
      <p className="text-[16px] text-ink-secondary leading-[1.75]">{quote.text}</p>

      <div className="flex items-center justify-center gap-1 mt-2.5">
        <p className="text-[12px] text-ink-tertiary">— {quote.author}</p>
        {/* 图标只有 12px，点击区靠 tap-min 在触屏上撑到 44px */}
        <button
          onClick={() => setQuote(q => randomQuote(q.text))}
          className="tap-min grid place-items-center w-8 h-8 text-ink-tertiary hover:text-accent transition-colors duration-200"
          title="换一句"
          aria-label="换一句"
        >
          <RefreshIcon size={12} />
        </button>
      </div>

      {notice && (
        <div className="flex items-center justify-center gap-2 mt-3 animate-fadeIn">
          <span className="text-[11.5px] text-accent">{notice}</span>
          {onDismissNotice && (
            <button
              onClick={onDismissNotice}
              className="tap-min grid place-items-center w-8 h-8 text-ink-tertiary hover:text-ink text-[14px] transition-colors duration-200"
              title="关闭"
              aria-label="关闭"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { randomQuote, type Quote } from '../lib/quotes'
import { RefreshIcon } from './icons'

// 首页顶部的随机文案：每次进入随机一条，「换一句」换下一条（不会重复当前这条）。
// 另外承载一次性的草稿恢复提示 —— 内联在卡片里，不用浮层，免得压住其他内容。
export default function QuoteCard({
  notice,
  onDismissNotice,
}: {
  notice?: string
  onDismissNotice?: () => void
}) {
  const [quote, setQuote] = useState<Quote>(() => randomQuote())

  return (
    <div className="glass rounded-glass flex items-start gap-3 px-5 py-3.5 mb-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] text-ink-secondary leading-relaxed">{quote.text}</p>
        <p className="text-[11.5px] text-ink-tertiary mt-1.5">— {quote.author}</p>

        {notice && (
          <div className="flex items-center gap-2 mt-2.5 animate-fadeIn">
            <span className="text-[11.5px] text-accent">{notice}</span>
            {onDismissNotice && (
              <button
                onClick={onDismissNotice}
                className="text-ink-tertiary hover:text-ink leading-none text-[14px] transition-colors duration-200"
                title="关闭"
                aria-label="关闭"
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setQuote(q => randomQuote(q.text))}
        className="btn-quiet p-1.5 shrink-0"
        title="换一句"
        aria-label="换一句"
      >
        <RefreshIcon size={13} />
      </button>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProfile, getDiaries, deleteDiary } from '../lib/storage'
import {
  downloadWord,
  downloadAllWords,
  defaultWordFileName,
  checkExportData,
  describeExportCheck,
} from '../lib/word'
import { WriteIcon, DownloadIcon, TrashIcon, CloseIcon } from '../components/icons'
import { useBodyScrollLock } from '../lib/useBodyScrollLock'
import type { Profile, DiaryEntry, DiaryWordData } from '../types'

// 从日期字符串解析 "8月23日" 或旧格式 "7.17" → { month, day }
function parseDate(dateStr: string | undefined | null): { month: string; day: string } {
  const s = (dateStr || '').trim()
  const m = s.match(/(\d+)月(\d+)日/)
  if (m) return { month: `${m[1]}月`, day: m[2] }
  const old = s.match(/^(\d+)\.(\d+)$/)
  if (old) return { month: `${old[1]}月`, day: old[2] }
  return { month: '', day: s }
}

function yearOf(createdAt: string | undefined | null): string {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}年`
}

function weekdayOf(createdAt: string | undefined | null): string {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return ''
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [exportError, setExportError] = useState('')
  const [exporting, setExporting] = useState(false)

  // 详情弹窗展开时锁住页面滚动：否则滚轮会穿过弹窗去滚身后的列表
  useBodyScrollLock(Boolean(selectedEntry))

  useEffect(() => {
    loadData()
  }, [])

  // 详情弹窗支持 Esc 关闭
  useEffect(() => {
    if (!selectedEntry) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedEntry(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedEntry])

  async function loadData() {
    setLoading(true)
    try {
      const prof = await getProfile()
      if (prof) setProfile(prof)
    } catch {
      /* ignore */
    }
    try {
      const diaryData = await getDiaries()
      if (diaryData) setEntries(diaryData)
    } catch {
      /* ignore */
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('确定要删除这篇记录吗？')) return
    setDeleting(id)
    await deleteDiary(id)
    setEntries(entries.filter(e => e.id !== id))
    setDeleting(null)
    if (selectedEntry?.id === id) setSelectedEntry(null)
  }

  function toWordData(entry: DiaryEntry, prof: Profile): DiaryWordData {
    return {
      name: prof.name,
      student_id: prof.student_id,
      class_name: prof.class_name,
      college: prof.college,
      teacher: prof.teacher,
      company: prof.company,
      company_teacher: prof.company_teacher,
      start_date: prof.start_date,
      end_date: prof.end_date,
      date: entry.date,
      position: entry.position,
      content: entry.content,
      feelings: entry.feelings,
      other: entry.other,
    }
  }

  function confirmIfIncomplete(data: DiaryWordData): boolean {
    const warning = describeExportCheck(checkExportData(data))
    if (!warning) return true
    return confirm(`${warning}。\n\n仍要导出吗？Word 中对应位置会留空。`)
  }

  async function handleDownload(entry: DiaryEntry) {
    if (!profile) return
    const data = toWordData(entry, profile)
    if (!confirmIfIncomplete(data)) return

    setExportError('')
    try {
      await downloadWord(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[导出失败]', e)
      setExportError(msg)
    }
  }

  async function handleDownloadAll() {
    if (!profile || !entries.length) return

    setExportError('')
    setExporting(true)
    try {
      const items = entries.map(entry => {
        const data = toWordData(entry, profile)
        return { data, fileName: defaultWordFileName(data) }
      })
      await downloadAllWords(items)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[批量导出失败]', e)
      setExportError(msg)
    } finally {
      setExporting(false)
    }
  }

  function summary(text: string | undefined | null): string {
    const safe = (text || '').replace(/\s+/g, ' ').trim()
    return safe.length > 60 ? safe.slice(0, 60) + '…' : safe
  }

  return (
    <div className="animate-riseIn">
      {/* 顶栏 */}
      <div className="glass rounded-glass-lg flex items-center justify-between gap-4 px-5 py-3.5 mb-3.5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[19px] font-bold text-ink tracking-tight">成长档案</h2>
          <span className="text-[12.5px] text-ink-tertiary">{entries.length} 篇记录</span>
        </div>
        {entries.length > 0 && (
          <button onClick={handleDownloadAll} disabled={exporting} className="btn-glass px-4 py-2 text-[12.5px]">
            <DownloadIcon size={14} />
            {exporting ? '打包中…' : '导出全部'}
          </button>
        )}
      </div>

      {/* 导出失败提示 */}
      {exportError && (
        <div className="rounded-glass border border-danger/25 bg-danger-soft px-5 py-4 mb-3.5 animate-popIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-danger mb-1.5">导出失败</p>
              <p className="text-[12.5px] text-danger/90 leading-relaxed break-all">{exportError}</p>
            </div>
            <button onClick={() => setExportError('')} className="btn-glass shrink-0 px-3.5 py-1.5 text-[12px]">
              <CloseIcon size={12} />
              关闭
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-24 text-ink-tertiary text-[13px]">正在翻阅…</div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-glass-lg px-8 py-16 text-center">
          <span
            className="mx-auto w-14 h-14 rounded-[18px] text-white grid place-items-center mb-5"
            style={{
              background: 'linear-gradient(160deg,#4EA8FF,#0A84FF)',
              boxShadow: '0 10px 26px -10px rgba(10,132,255,.85), inset 0 1px 0 rgba(255,255,255,.5)',
            }}
          >
            <WriteIcon size={24} />
          </span>
          <p className="text-[15.5px] font-semibold text-ink">还没有记录</p>
          <p className="text-[13px] text-ink-tertiary mt-2">从「今天」开始，写下第一篇日记</p>
          <Link to="/" className="btn-primary mt-7">
            去写今天
          </Link>
        </div>
      ) : (
        <div className="grid gap-2.5">
          {entries.map(entry => {
            const { month, day } = parseDate(entry.date)
            const year = yearOf(entry.created_at)
            const weekday = weekdayOf(entry.created_at)
            const showYear = year !== '' && year !== `${new Date().getFullYear()}年`
            const active = selectedEntry?.id === entry.id

            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`glass rounded-glass px-5 py-4 text-left w-full glass-hover ${
                  active ? 'bg-white/70 shadow-glass-ring' : ''
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <span className="text-[24px] font-bold leading-none tracking-tight text-ink tabular-nums">
                      {day}
                    </span>
                    <span className="text-[11px] mt-1.5 text-ink-tertiary">{month}</span>
                  </div>

                  <div className="w-px self-stretch bg-hairline" />

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="chip bg-accent-soft text-accent">{entry.position}</span>
                      <span className="text-[11.5px] text-ink-tertiary">
                        {weekday}
                        {weekday && showYear ? ' · ' : ''}
                        {showYear ? year : ''}
                      </span>
                    </div>
                    <p className="text-[13.5px] text-ink-secondary line-clamp-2 leading-relaxed">
                      {summary(entry.content || entry.feelings || '（无摘要）')}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* 详情弹窗
          - useBodyScrollLock：不锁的话滚轮会穿过弹窗去滚身后的列表页
          - overscroll-contain：弹窗自己滚到底后不再把滚动链传给页面
          - 遮罩加深一点，弹窗才浮得起来（原来 20% 太浅，背景糊成一片） */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[10px] overscroll-contain flex items-start justify-center overflow-y-auto px-4 py-10 md:py-16 animate-fadeIn"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="glass rounded-glass-lg shadow-glass-lift w-full max-w-[660px] p-6 md:p-9 animate-popIn"
            style={{ background: 'rgba(255,255,255,0.78)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[21px] font-bold text-ink tracking-tight">
                    {selectedEntry.date}
                  </span>
                  <span className="chip bg-accent-soft text-accent">{selectedEntry.position}</span>
                </div>
                <div className="text-[12.5px] text-ink-tertiary mt-2">
                  {[yearOf(selectedEntry.created_at), weekdayOf(selectedEntry.created_at)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownload(selectedEntry)} className="btn-glass px-4 py-2 text-[12.5px]">
                  <DownloadIcon size={14} />
                  下载 Word
                </button>
                <button
                  onClick={() => handleDelete(selectedEntry.id)}
                  disabled={deleting === selectedEntry.id}
                  className="btn-quiet text-danger hover:bg-danger-soft disabled:opacity-50"
                >
                  <TrashIcon size={14} />
                  删除
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="btn-quiet p-2"
                  title="关闭（Esc）"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <h4 className="text-[12px] font-semibold text-ink-tertiary mb-2.5 tracking-wide">今天</h4>
                <p className="text-[14.5px] leading-[1.95] text-ink whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
              </section>
              {selectedEntry.feelings && (
                <section className="pt-6 border-t border-hairline">
                  <h4 className="text-[12px] font-semibold text-ink-tertiary mb-2.5 tracking-wide">收获</h4>
                  <p className="text-[14.5px] leading-[1.95] text-ink whitespace-pre-wrap">
                    {selectedEntry.feelings}
                  </p>
                </section>
              )}
              {selectedEntry.other && (
                <section className="pt-6 border-t border-hairline">
                  <h4 className="text-[12px] font-semibold text-ink-tertiary mb-2.5 tracking-wide">
                    值得记住的
                  </h4>
                  <p className="text-[14.5px] leading-[1.95] text-ink whitespace-pre-wrap">
                    {selectedEntry.other}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

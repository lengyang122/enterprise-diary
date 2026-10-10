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
import type { Profile, DiaryEntry, DiaryWordData } from '../types'

// 从日期字符串解析 "8月23日" 或旧格式 "7.17" → { month, day }
function parseDate(dateStr: string | undefined | null): { month: string; day: string } {
  const s = (dateStr || '').trim()
  const m = s.match(/(\d+)月(\d+)日/)
  if (m) return { month: `${m[1]}月`, day: m[2] }
  // 兼容旧格式 "7.17"
  const old = s.match(/^(\d+)\.(\d+)$/)
  if (old) return { month: `${old[1]}月`, day: old[2] }
  return { month: '', day: s }
}

// 记录写入年份（跨年时用于区分）
function yearOf(createdAt: string | undefined | null): string {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}年`
}

// 星期几 —— 日记场景下有实际参考价值
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

  // 组装 Word 导出数据
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

  // 导出前体检：信息缺失时先提示（Word 中对应位置会留空）
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

  // 批量导出为一个 zip
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

  // 摘要：取内容前 60 字（防御 undefined）
  function summary(text: string | undefined | null): string {
    const safe = (text || '').replace(/\s+/g, ' ').trim()
    return safe.length > 60 ? safe.slice(0, 60) + '…' : safe
  }

  return (
    <div className="max-w-[720px] mx-auto animate-riseIn">
      {/* 标题 */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-semibold tracking-tight text-base-text">成长档案</h2>
          <p className="text-[13px] text-base-muted mt-1.5">{entries.length} 篇记录</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={exporting}
            className="btn-ghost px-3.5 py-2 text-[12px]"
          >
            <DownloadIcon size={14} />
            {exporting ? '打包中…' : '导出全部'}
          </button>
        )}
      </div>

      {/* 导出失败提示 */}
      {exportError && (
        <div className="mb-5 rounded-card border border-red-200 bg-red-50/70 px-5 py-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-red-700 mb-1.5">导出失败</p>
              <p className="text-[12.5px] text-red-600 leading-relaxed break-all">{exportError}</p>
            </div>
            <button
              onClick={() => setExportError('')}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[9px] border border-red-200 text-[11.5px] text-red-600 hover:bg-red-100 transition-colors duration-200"
            >
              <CloseIcon size={12} />
              关闭
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-base-muted text-[13px]">正在翻阅…</div>
      ) : entries.length === 0 ? (
        <div className="card px-8 py-16 text-center">
          <span className="mx-auto w-12 h-12 rounded-[14px] bg-base-accent-soft text-base-accent grid place-items-center mb-5">
            <WriteIcon size={22} />
          </span>
          <p className="text-[15px] font-medium text-base-text">还没有记录</p>
          <p className="text-[13px] text-base-muted mt-2">从「今天」开始，写下第一篇日记</p>
          <Link to="/" className="btn-primary px-5 py-2.5 text-[13px] mt-7 inline-flex">
            去写今天
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map(entry => {
            const { month, day } = parseDate(entry.date)
            const year = yearOf(entry.created_at)
            const weekday = weekdayOf(entry.created_at)
            // 只有跨年记录才补年份，避免与左侧日期块重复
            const showYear = year !== '' && year !== `${new Date().getFullYear()}年`
            const active = selectedEntry?.id === entry.id

            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`group w-full card px-5 py-4 text-left transition-all duration-200 hover:shadow-lift hover:border-base-line-strong hover:-translate-y-[1px] ${
                  active ? 'border-base-accent/40 shadow-lift' : ''
                }`}
              >
                <div className="flex items-start gap-5">
                  {/* 日期 */}
                  <div className="flex flex-col items-center w-12 shrink-0">
                    <span className="text-[24px] font-semibold leading-none tracking-tight text-base-text tabular-nums">
                      {day}
                    </span>
                    <span className="text-[11px] mt-1.5 text-base-muted">{month}</span>
                  </div>

                  {/* 分隔线 */}
                  <div className="w-px self-stretch bg-base-line" />

                  {/* 内容摘要 */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="chip bg-base-accent-soft text-base-accent">
                        {entry.position}
                      </span>
                      <span className="text-[11px] text-base-muted">
                        {weekday}
                        {weekday && showYear ? ' · ' : ''}
                        {showYear ? year : ''}
                      </span>
                    </div>
                    <p className="text-[13px] text-base-secondary line-clamp-2 leading-relaxed">
                      {summary(entry.content || entry.feelings || '（无摘要）')}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* 详情 — 阅读状态 */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 bg-base-text/25 backdrop-blur-[3px] flex items-start justify-center overflow-y-auto px-4 py-10 md:py-16 animate-fadeIn"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="bg-base-surface w-full max-w-[660px] rounded-card border border-base-line shadow-lift p-6 md:p-9"
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[20px] font-semibold text-base-text tracking-tight">
                    {selectedEntry.date}
                  </span>
                  <span className="chip bg-base-accent-soft text-base-accent">
                    {selectedEntry.position}
                  </span>
                </div>
                <div className="text-[12px] text-base-muted mt-2">
                  {[yearOf(selectedEntry.created_at), weekdayOf(selectedEntry.created_at)]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedEntry)}
                  className="btn-ghost px-3.5 py-2 text-[12px]"
                >
                  <DownloadIcon size={14} />
                  下载 Word
                </button>
                <button
                  onClick={() => handleDelete(selectedEntry.id)}
                  disabled={deleting === selectedEntry.id}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-button text-[12px] text-base-muted hover:text-red-500 hover:bg-red-50 transition-colors duration-200 disabled:opacity-50"
                >
                  <TrashIcon size={14} />
                  删除
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-2 rounded-button text-base-muted hover:text-base-text hover:bg-base-bg transition-colors duration-200"
                  title="关闭（Esc）"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>

            {/* 正文 */}
            <div className="space-y-6">
              <section>
                <h4 className="text-[12px] font-semibold text-base-muted mb-2.5 tracking-wide">
                  今天
                </h4>
                <p className="text-[14px] leading-[1.95] text-base-text whitespace-pre-wrap">
                  {selectedEntry.content}
                </p>
              </section>
              {selectedEntry.feelings && (
                <section className="pt-6 border-t border-base-line">
                  <h4 className="text-[12px] font-semibold text-base-muted mb-2.5 tracking-wide">
                    收获
                  </h4>
                  <p className="text-[14px] leading-[1.95] text-base-text whitespace-pre-wrap">
                    {selectedEntry.feelings}
                  </p>
                </section>
              )}
              {selectedEntry.other && (
                <section className="pt-6 border-t border-base-line">
                  <h4 className="text-[12px] font-semibold text-base-muted mb-2.5 tracking-wide">
                    值得记住的
                  </h4>
                  <p className="text-[14px] leading-[1.95] text-base-text whitespace-pre-wrap">
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

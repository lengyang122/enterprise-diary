import { useState, useEffect } from 'react'
import { getProfile, getDiaries, deleteDiary } from '../lib/storage'
import {
  downloadWord,
  downloadAllWords,
  defaultWordFileName,
  checkExportData,
  describeExportCheck,
} from '../lib/word'
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

  async function loadData() {
    setLoading(true)
    try {
      const prof = await getProfile()
      if (prof) setProfile(prof)
    } catch { /* ignore */ }
    try {
      const diaryData = await getDiaries()
      if (diaryData) setEntries(diaryData)
    } catch { /* ignore */ }
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

  // 摘要：取内容前 40 字（防御 undefined）
  function summary(text: string | undefined | null): string {
    const safe = (text || '').replace(/\s+/g, ' ').trim()
    return safe.length > 40 ? safe.slice(0, 40) + '…' : safe
  }

  return (
    <div className="max-w-[680px] mx-auto animate-fadeIn">
      {/* 标题 */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-medium tracking-tight text-base-text">成长档案</h2>
          <p className="text-[13px] text-base-muted mt-1">{entries.length} 篇记录</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={exporting}
            className="shrink-0 px-3.5 py-1.5 rounded-[10px] border border-base-line text-[12px] text-base-secondary hover:bg-base-surface hover:text-base-text transition-colors duration-150 disabled:opacity-50"
          >
            {exporting ? '打包中…' : '导出全部'}
          </button>
        )}
      </div>

      {/* 导出失败提示 */}
      {exportError && (
        <div className="mb-6 rounded-[14px] border border-red-200 bg-red-50/60 px-5 py-4 animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-red-700 mb-1.5">导出失败</p>
              <p className="text-[13px] text-red-600 leading-relaxed break-all">{exportError}</p>
            </div>
            <button
              onClick={() => setExportError('')}
              className="shrink-0 px-3 py-1.5 rounded-[9px] border border-red-200 text-[12px] text-red-600 hover:bg-red-100 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-base-muted text-sm">正在翻阅…</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-base-secondary">还没有记录</p>
          <p className="text-[13px] text-base-muted mt-1.5">从「今天」开始，写下第一篇日记</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 时间线列表 */}
          {entries.map(entry => {
            const { month, day } = parseDate(entry.date)
            const active = selectedEntry?.id === entry.id
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full flex items-start gap-5 px-4 py-4 rounded-[14px] text-left transition-all duration-200 group ${
                  active
                    ? 'bg-base-surface'
                    : 'hover:bg-base-surface/60'
                }`}
              >
                {/* 日期 */}
                <div className={`flex flex-col items-center w-12 shrink-0 transition-colors duration-200 ${active ? 'text-base-accent' : 'text-base-secondary'}`}>
                  <span className="text-[22px] font-medium leading-none tracking-tight">{day}</span>
                  <span className="text-[11px] mt-1 text-base-muted">{month}</span>
                </div>

                {/* 分隔线 */}
                <div className={`w-px self-stretch transition-colors duration-200 ${active ? 'bg-base-accent/40' : 'bg-base-line'}`} />

                {/* 内容摘要 */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-base-text">{entry.position}</span>
                    <span className="text-[11px] text-base-muted">
                      {entry.created_at
                        ? new Date(entry.created_at).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
                        : ''}
                    </span>
                  </div>
                  <p className="text-[13px] text-base-secondary mt-1.5 leading-relaxed truncate">
                    {summary(entry.content || entry.feelings || '（无摘要）')}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* 详情 — 阅读状态 */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-base-bg/60 backdrop-blur-[2px] flex items-start justify-center overflow-y-auto" onClick={() => setSelectedEntry(null)}>
          <div
            className="bg-base-surface w-full max-w-[620px] my-10 mx-4 rounded-[16px] p-8 md:p-10 shadow-soft animate-fadeIn"
            onClick={e => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="text-[20px] font-medium text-base-text">{selectedEntry.date}</div>
                <div className="text-[13px] text-base-muted mt-1">{selectedEntry.position}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(selectedEntry)}
                  className="px-3.5 py-1.5 rounded-[10px] border border-base-line text-[12px] text-base-secondary hover:bg-base-bg transition-colors"
                >
                  下载 Word
                </button>
                <button
                  onClick={() => handleDelete(selectedEntry.id)}
                  disabled={deleting === selectedEntry.id}
                  className="px-3.5 py-1.5 rounded-[10px] text-[12px] text-base-muted hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </div>

            {/* 正文 */}
            <div className="space-y-8">
              <section>
                <h4 className="text-[12px] font-medium text-base-muted mb-2.5 tracking-wide">今天</h4>
                <p className="text-[14px] leading-[1.9] text-base-text whitespace-pre-wrap">{selectedEntry.content}</p>
              </section>
              {selectedEntry.feelings && (
                <>
                  <div className="border-t border-base-line/70" />
                  <section>
                    <h4 className="text-[12px] font-medium text-base-muted mb-2.5 tracking-wide">收获</h4>
                    <p className="text-[14px] leading-[1.9] text-base-text whitespace-pre-wrap">{selectedEntry.feelings}</p>
                  </section>
                </>
              )}
              {selectedEntry.other && (
                <>
                  <div className="border-t border-base-line/70" />
                  <section>
                    <h4 className="text-[12px] font-medium text-base-muted mb-2.5 tracking-wide">值得记住的</h4>
                    <p className="text-[14px] leading-[1.9] text-base-text whitespace-pre-wrap">{selectedEntry.other}</p>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { generateDiaryContent, regenerateSection } from '../lib/ai'
import { downloadWord, checkExportData, describeExportCheck } from '../lib/word'
import { getProfile, insertDiary, getDraft, saveDraft, clearDraft } from '../lib/storage'
import { evaluateSections, type SectionKey, type SectionQuality } from '../lib/text'
import type { Profile, DiaryFormInput, AIGeneratedResult, DiaryWordData } from '../types'

// 常用实习岗位（仅作输入联想，仍可自由填写）
const POSITION_PRESETS = [
  'PQE',
  'SQE',
  'QE',
  'PE',
  'ME',
  'IE',
  'IQC',
  'OQC',
  '工艺工程师',
  '设备工程师',
  '生产管理',
  '研发助理',
]

// 岗位持久化：记住上次设置的岗位（帮同学写日记时不用反复改）
const POSITION_KEY = 'enterprise-diary-last-position'
function loadPosition(): string {
  try {
    return localStorage.getItem(POSITION_KEY) || 'PQE'
  } catch {
    return 'PQE'
  }
}
function persistPosition(v: string) {
  try {
    localStorage.setItem(POSITION_KEY, v)
  } catch {
    // 忽略
  }
}

export default function DiaryCreatePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiResult, setAiResult] = useState<AIGeneratedResult | null>(null)
  const [genError, setGenError] = useState('')
  const [exportError, setExportError] = useState('')
  const [regenerating, setRegenerating] = useState<SectionKey | null>(null)
  const [regenError, setRegenError] = useState('')
  // 草稿：restored 用于提示，ready 表示恢复流程已结束（此前不写库，避免覆盖已有草稿）
  const [restored, setRestored] = useState(false)
  const [ready, setReady] = useState(false)
  const [form, setForm] = useState<DiaryFormInput>({
    date: formatDate(new Date()),
    position: loadPosition(),
    content: '',
    feelings: '',
    other: '',
  })

  // 加载个人信息，并恢复未提交的草稿
  useEffect(() => {
    loadProfile()
    restoreDraft()
  }, [])

  async function loadProfile() {
    try {
      const data = await getProfile()
      if (data) setProfile(data)
    } catch {
      // 忽略
    }
  }

  async function restoreDraft() {
    try {
      const draft = await getDraft()
      if (draft) {
        setForm(draft.form)
        setAiResult(draft.aiResult)
        setRestored(true)
      }
    } catch {
      // 忽略
    } finally {
      setReady(true)
    }
  }

  // 草稿自动保存（防抖 600ms）
  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      saveDraft(form, aiResult)
    }, 600)
    return () => clearTimeout(timer)
  }, [ready, form, aiResult])

  function formatDate(d: Date): string {
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}月${day}日`
  }

  // AI 生成
  async function handleGenerate() {
    if (!form.content && !form.feelings) {
      alert('请至少写下一点今天的内容')
      return
    }

    setGenerating(true)
    setGenError('')
    try {
      const result = await generateDiaryContent(form)
      setAiResult(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '生成失败'
      // 错误显示在页面上（用户可截图），同时后台记录
      console.error('[生成失败]', err)
      setGenError(message)
    } finally {
      setGenerating(false)
    }
  }

  // 保存
  async function handleSave() {
    if (!profile) {
      alert('请先在设置页面填写个人信息')
      return
    }
    if (!aiResult) {
      alert('请先让 AI 整理内容')
      return
    }

    setSaving(true)
    try {
      await insertDiary({
        date: form.date,
        position: form.position,
        content: aiResult.content,
        feelings: aiResult.feelings,
        other: aiResult.other,
      })
      await clearDraft()
      setRestored(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '保存失败'
      alert('保存失败: ' + message)
    } finally {
      setSaving(false)
    }
  }

  // 下载 Word
  async function handleDownload() {
    if (!profile || !aiResult) return

    const data: DiaryWordData = {
      name: profile.name,
      student_id: profile.student_id,
      class_name: profile.class_name,
      college: profile.college,
      teacher: profile.teacher,
      company: profile.company,
      company_teacher: profile.company_teacher,
      start_date: profile.start_date,
      end_date: profile.end_date,
      date: form.date,
      position: form.position,
      content: aiResult.content,
      feelings: aiResult.feelings,
      other: aiResult.other,
    }

    // 导出前体检：信息缺失时先提示（Word 中对应位置会留空）
    const warning = describeExportCheck(checkExportData(data))
    if (warning && !confirm(`${warning}。\n\n仍要导出吗？Word 中对应位置会留空。`)) return

    setExportError('')
    try {
      await downloadWord(data)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[导出失败]', e)
      setExportError(msg)
    }
  }

  // 单栏重新生成
  async function handleRegenerate(key: SectionKey) {
    if (!aiResult) return
    setRegenerating(key)
    setRegenError('')
    try {
      const text = await regenerateSection(key, form, aiResult[key])
      setAiResult(prev => (prev ? { ...prev, [key]: text } : prev))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[重新生成失败]', e)
      setRegenError(msg)
    } finally {
      setRegenerating(null)
    }
  }

  // 重置（保留当前岗位，清空其他内容）
  function handleReset() {
    setForm({
      date: formatDate(new Date()),
      position: form.position,
      content: '',
      feelings: '',
      other: '',
    })
    setAiResult(null)
    setSaved(false)
    setGenError('')
    setRestored(false)
    void clearDraft()
  }

  // === 生成中状态 ===
  if (generating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center animate-fadeIn">
        <div className="text-center">
          <div className="text-[15px] text-base-text tracking-wide mb-4">
            正在替你整理今天…
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-base-accent animate-softPulse"
                style={{ animationDelay: `${i * 0.28}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // === AI 生成完成状态 ===
  if (aiResult) {
    const quality = evaluateSections(aiResult)
    const q = (key: SectionKey) => quality.find(item => item.key === key)!

    return (
      <div className="space-y-8 animate-fadeIn">
        {restored && <RestoreNotice onDismiss={() => setRestored(false)} />}
        {/* 顶部元信息 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-base-secondary">
            <span className="text-[15px] font-medium text-base-text">{form.date}</span>
            <span className="text-base-muted">·</span>
            <span>{form.position}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-base-muted">
            <span className="inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 8.5a5.5 5.5 0 1 1-4-5.3" />
                <path d="M13.5 3v3h-3" />
              </svg>
              AI整理
            </span>
          </div>
        </div>

        {/* 结果 — 个人记录阅读状态 */}
        <div className="space-y-10 max-w-[680px] mx-auto">
          <ResultSection
            title="今天"
            quality={q('content')}
            text={aiResult.content}
            busy={regenerating === 'content'}
            onRegenerate={() => handleRegenerate('content')}
          />

          {aiResult.feelings && (
            <>
              <div className="border-t border-base-line/70" />
              <ResultSection
                title="收获"
                quality={q('feelings')}
                text={aiResult.feelings}
                busy={regenerating === 'feelings'}
                onRegenerate={() => handleRegenerate('feelings')}
              />
            </>
          )}

          {aiResult.other && (
            <>
              <div className="border-t border-base-line/70" />
              <ResultSection
                title="值得记住的"
                quality={q('other')}
                text={aiResult.other}
                busy={regenerating === 'other'}
                onRegenerate={() => handleRegenerate('other')}
              />
            </>
          )}
        </div>

        {/* 操作区 */}
        <div className="flex items-center justify-center gap-3 pt-4 max-w-[680px] mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-[11px] bg-base-accent text-white text-[13px] hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存今天'}
          </button>
          <button
            onClick={handleDownload}
            className="px-5 py-2 rounded-[11px] border border-base-line text-base-secondary text-[13px] hover:bg-base-surface hover:text-base-text active:scale-[0.98] transition-all duration-150"
          >
            下载 Word
          </button>
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-[11px] text-[13px] text-base-muted hover:text-base-text transition-colors duration-150"
          >
            重写
          </button>
        </div>

        {/* 导出失败提示 */}
        {exportError && <ErrorPanel title="导出失败" message={exportError} />}

        {/* 重新生成失败提示 */}
        {regenError && <ErrorPanel title="重新生成失败" message={regenError} />}

        {/* 保存成功提示 */}
        {saved && (
          <div className="fixed bottom-8 right-8 px-4 py-2 rounded-[11px] bg-base-text text-base-surface text-[13px] shadow-soft animate-fadeIn z-50">
            已保存
          </div>
        )}
      </div>
    )
  }

  // === 输入状态 ===
  return (
    <div className="max-w-[680px] mx-auto space-y-12 animate-fadeIn">
      {restored && <RestoreNotice onDismiss={() => setRestored(false)} />}
      {/* 顶部标题 — 克制 */}
      <div className="text-center">
        <h2 className="text-[26px] font-medium tracking-tight text-base-text">今天</h2>
        <div className="flex items-center justify-center gap-2 mt-3 text-[13px] text-base-secondary">
          <EditableChip value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          <span className="text-base-muted">·</span>
          <EditableChip
            value={form.position}
            options={POSITION_PRESETS}
            onChange={v => {
              setForm(f => ({ ...f, position: v }))
              persistPosition(v)
            }}
          />
        </div>
        {profile && (
          <p className="mt-4 text-xs text-base-muted">
            {profile.name} · {profile.company}
          </p>
        )}
      </div>

      {/* 三个提示式输入区 */}
      <div className="space-y-10">
        <PromptArea
          title="今天发生了什么？"
          hint="现场工作、会议、异常、数据、沟通…"
          value={form.content}
          onChange={v => setForm(f => ({ ...f, content: v }))}
          placeholder="记录几个关键词就好，比如：参加异常分析会议、跟进锡膏印刷不良…"
        />
        <PromptArea
          title="今天有什么收获？"
          hint="学到的方法、对质量的理解、新的认识…"
          value={form.feelings}
          onChange={v => setForm(f => ({ ...f, feelings: v }))}
          placeholder="例如：第一次接触5Why分析、理解了QCP的管控逻辑…"
        />
        <PromptArea
          title="还有什么想留下？"
          hint="临时事项、培训、会议、想记住的瞬间…"
          value={form.other}
          onChange={v => setForm(f => ({ ...f, other: v }))}
          placeholder="可留空，AI 会结合今天的内容补充…"
        />
      </div>

      {/* 生成失败提示 — 显示在页面上，方便截图反馈 */}
      {genError && <ErrorPanel title="生成失败" message={genError} />}

      {/* AI 按钮 — 核心 CTA */}
      <div className="flex justify-center pt-2 pb-6">
        <button
          onClick={handleGenerate}
          className="group inline-flex items-center gap-2 px-7 py-2.5 rounded-[11px] bg-base-accent text-white text-[14px] font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150 shadow-soft"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:rotate-45"
          >
            <path d="M8 2v12M2 8h12" />
          </svg>
          整理今天
        </button>
      </div>
    </div>
  )
}

// 提示式输入区
function PromptArea({
  title,
  hint,
  value,
  onChange,
  placeholder,
}: {
  title: string
  hint: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="transition-all duration-200">
      <div className="flex items-baseline gap-3 mb-2.5">
        <h3 className={`text-[15px] font-medium tracking-wide transition-colors duration-200 ${focused ? 'text-base-text' : 'text-base-secondary'}`}>
          {title}
        </h3>
        <span className="text-[11px] text-base-muted">{hint}</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={2}
        className={`
          w-full px-4 py-3 rounded-[12px] resize-none text-[14px] leading-relaxed text-base-text
          transition-all duration-200
          placeholder:text-base-muted
          ${focused
            ? 'bg-base-surface border border-base-accent/25'
            : 'bg-transparent border border-transparent hover:bg-base-surface'}
        `}
      />
    </div>
  )
}

// 可编辑胶囊：点击后变为输入框，回车/失焦保存
function EditableChip({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    const v = draft.trim()
    if (v) onChange(v)
    setEditing(false)
  }

  if (editing) {
    return (
      <>
        <input
          autoFocus
          type="text"
          list={options ? 'position-presets' : undefined}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="w-28 px-2 py-0.5 text-center text-[13px] text-base-text bg-base-surface border border-base-accent/30 rounded-full focus:outline-none"
        />
        {options && (
          <datalist id="position-presets">
            {options.map(o => (
              <option key={o} value={o} />
            ))}
          </datalist>
        )}
      </>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="group inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-base-surface border border-base-line/70 text-base-text hover:border-base-accent/40 transition-colors duration-150"
      title="点击修改"
    >
      {value}
      <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-base-muted opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
      </svg>
    </button>
  )
}

// 草稿恢复提示 — 安静的一行，可关闭
function RestoreNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="rounded-[12px] border border-base-accent/20 bg-base-accent-soft px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-[12px] text-base-secondary">已恢复上次未完成的草稿</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-[12px] text-base-muted hover:text-base-text transition-colors duration-150"
      >
        知道了
      </button>
    </div>
  )
}

// 生成结果的单栏：标题 + 字数达标状态 + 正文 + 单栏重新生成
function ResultSection({
  title,
  quality,
  text,
  busy,
  onRegenerate,
}: {
  title: string
  quality: SectionQuality
  text: string
  busy: boolean
  onRegenerate: () => void
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-medium text-base-secondary tracking-wide">{title}</h3>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] ${quality.tooShort ? 'text-amber-600' : 'text-base-muted'}`}>
            {quality.count} 字
            {quality.tooShort && ` · 少于 ${quality.min}`}
            {quality.tooLong && ` · 超过 ${quality.max}`}
            {!quality.empty && quality.ok && ' · 达标'}
          </span>
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="text-[11px] text-base-muted hover:text-base-accent transition-colors duration-150 disabled:opacity-50"
          >
            {busy ? '重写中…' : '重新生成'}
          </button>
        </div>
      </div>
      <p className="text-[15px] leading-[1.9] text-base-text whitespace-pre-wrap">{text}</p>
    </section>
  )
}

// 错误提示 — 显示在页面上而不是 alert，附带一键复制，方便截图反馈
function ErrorPanel({ title, message }: { title: string; message: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 忽略
    }
  }

  return (
    <div className="max-w-[680px] mx-auto rounded-[14px] border border-red-200 bg-red-50/60 px-5 py-4 animate-fadeIn">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-red-700 mb-1.5">{title}</p>
          <p className="text-[13px] text-red-600 leading-relaxed break-all">{message}</p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 px-3 py-1.5 rounded-[9px] border border-red-200 text-[12px] text-red-600 hover:bg-red-100 transition-colors"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <p className="text-[11px] text-red-400 mt-2.5">请截图或复制以上信息发给开发者排查</p>
    </div>
  )
}

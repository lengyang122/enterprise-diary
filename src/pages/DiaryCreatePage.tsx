import { useState, useEffect } from 'react'
import { generateDiaryContent, regenerateSection } from '../lib/ai'
import { downloadWord, checkExportData, describeExportCheck } from '../lib/word'
import { getProfile, insertDiary, getDraft, saveDraft, clearDraft } from '../lib/storage'
import { evaluateSections, type SectionKey, type SectionQuality } from '../lib/text'
import { PlusIcon, RefreshIcon, DownloadIcon } from '../components/icons'
import type { Profile, DiaryFormInput, AIGeneratedResult, DiaryWordData } from '../types'

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
    setExportError('')
    setRegenError('')
    setRestored(false)
    void clearDraft()
  }

  // === 生成中状态 ===
  if (generating) {
    return (
      <div className="min-h-[62vh] flex items-center justify-center animate-fadeIn">
        <div className="glass rounded-glass-lg px-12 py-10 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-accent animate-softPulse"
                style={{ animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>
          <div className="text-[14px] text-ink-secondary tracking-wide">正在替你整理今天…</div>
        </div>
      </div>
    )
  }

  // === AI 生成完成状态 ===
  if (aiResult) {
    const quality = evaluateSections(aiResult)
    const q = (key: SectionKey) => quality.find(item => item.key === key)!

    return (
      <div className="animate-riseIn">
        {restored && <RestoreNotice onDismiss={() => setRestored(false)} />}

        {/* 顶栏 */}
        <div className="glass rounded-glass-lg flex items-center justify-between gap-4 px-5 py-3.5 mb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[19px] font-bold text-ink tracking-tight">{form.date}</span>
            <span className="chip bg-accent-soft text-accent">{form.position}</span>
          </div>
          <span className="chip chip-glass">
            <RefreshIcon size={12} />
            AI 整理
          </span>
        </div>

        {/* 结果 */}
        <div className="grid gap-3.5">
          <ResultSection
            title="今天"
            quality={q('content')}
            text={aiResult.content}
            busy={regenerating === 'content'}
            onRegenerate={() => handleRegenerate('content')}
          />
          {aiResult.feelings && (
            <ResultSection
              title="收获"
              quality={q('feelings')}
              text={aiResult.feelings}
              busy={regenerating === 'feelings'}
              onRegenerate={() => handleRegenerate('feelings')}
            />
          )}
          {aiResult.other && (
            <ResultSection
              title="值得记住的"
              quality={q('other')}
              text={aiResult.other}
              busy={regenerating === 'other'}
              onRegenerate={() => handleRegenerate('other')}
            />
          )}
        </div>

        {/* 操作区 */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? '保存中…' : '保存今天'}
          </button>
          <button onClick={handleDownload} className="btn-glass">
            <DownloadIcon size={15} />
            下载 Word
          </button>
          <button onClick={handleReset} className="btn-quiet">
            重写
          </button>
        </div>

        {exportError && (
          <div className="mt-4">
            <ErrorPanel title="导出失败" message={exportError} />
          </div>
        )}
        {regenError && (
          <div className="mt-4">
            <ErrorPanel title="重新生成失败" message={regenError} />
          </div>
        )}

        {saved && (
          <div className="fixed bottom-8 right-8 px-5 py-3 rounded-full bg-ink text-white text-[13px] shadow-glass-lift animate-popIn z-50">
            已保存
          </div>
        )}
      </div>
    )
  }

  // === 输入状态 ===
  return (
    <div className="animate-riseIn">
      {restored && <RestoreNotice onDismiss={() => setRestored(false)} />}

      {/* 顶栏 */}
      <div className="glass rounded-glass-lg flex items-center justify-between gap-4 px-5 py-3.5 mb-3.5">
        <h2 className="text-[19px] font-bold text-ink tracking-tight">今天</h2>
        <div className="flex items-center gap-2">
          <EditableChip value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          <EditableChip
            value={form.position}
            options={POSITION_PRESETS}
            onChange={v => {
              setForm(f => ({ ...f, position: v }))
              persistPosition(v)
            }}
          />
        </div>
      </div>

      {/* 三个输入区 */}
      <div className="grid gap-3.5">
        <PromptArea
          title="今天发生了什么？"
          hint="现场工作、会议、异常、数据"
          value={form.content}
          onChange={v => setForm(f => ({ ...f, content: v }))}
          placeholder="记录几个关键词就好，比如：参加异常分析会议、跟进锡膏印刷不良…"
        />
        <PromptArea
          title="今天有什么收获？"
          hint="学到的方法、新的认识"
          value={form.feelings}
          onChange={v => setForm(f => ({ ...f, feelings: v }))}
          placeholder="例如：第一次接触5Why分析、理解了QCP的管控逻辑…"
        />
        <PromptArea
          title="还有什么想留下？"
          hint="可留空"
          value={form.other}
          onChange={v => setForm(f => ({ ...f, other: v }))}
          placeholder="可留空。临时事项、培训、会议、想记住的瞬间…"
        />
      </div>

      {genError && (
        <div className="mt-4">
          <ErrorPanel title="生成失败" message={genError} />
        </div>
      )}

      {/* 主操作 */}
      <div className="flex justify-center pt-7">
        <button onClick={handleGenerate} className="btn-primary">
          <PlusIcon size={16} />
          整理今天
        </button>
      </div>

      {profile && (
        <p className="text-center text-[12px] text-ink-tertiary mt-5">
          {profile.name}
          {profile.company ? ` · ${profile.company}` : ''}
        </p>
      )}
    </div>
  )
}

// ============================================================
// 局部组件
// ============================================================

// 玻璃输入卡：悬停浮起、聚焦时提亮 + 蓝色光环
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
  return (
    <div className="glass rounded-glass px-5 py-4 glass-hover focus-within:bg-white/70 focus-within:shadow-glass-ring">
      <div className="flex items-center gap-2.5 mb-2.5">
        <h3 className="text-[14.5px] font-semibold text-ink tracking-tight shrink-0">{title}</h3>
        <span className="ml-auto hidden sm:block text-[11.5px] text-ink-tertiary">{hint}</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-transparent resize-none text-[14.5px] leading-[1.92] text-ink placeholder:text-ink-tertiary"
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
          className="w-28 px-3.5 py-1.5 text-center text-[13px] text-ink bg-white/85 border border-accent rounded-full shadow-glass-sm"
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
    <button onClick={startEdit} className="chip chip-glass" title="点击修改">
      {value}
    </button>
  )
}

// 生成结果的单栏：标题 + 字数状态 + 正文 + 单栏重新生成
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
  const warn = quality.tooShort || quality.tooLong

  return (
    <section className="glass rounded-glass px-5 py-4 md:px-6 md:py-5 glass-hover">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[14px] font-semibold text-ink tracking-tight">{title}</h3>
        <div className="flex items-center gap-2">
          <span className={`chip ${warn ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent'}`}>
            {quality.count} 字
            {quality.tooShort && ` · 少于 ${quality.min}`}
            {quality.tooLong && ` · 超过 ${quality.max}`}
            {!quality.empty && quality.ok && ' · 达标'}
          </span>
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="btn-quiet text-[12px] disabled:opacity-50"
            title="只重写这一栏"
          >
            <RefreshIcon size={12} />
            {busy ? '重写中…' : '重新生成'}
          </button>
        </div>
      </div>
      <p className="text-[14.5px] leading-[1.95] text-ink whitespace-pre-wrap">{text}</p>
    </section>
  )
}

// 草稿恢复提示
function RestoreNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="glass rounded-glass flex items-center justify-between gap-4 px-4 py-2.5 mb-3.5 animate-fadeIn">
      <p className="text-[12.5px] text-ink-secondary">已恢复上次未完成的草稿</p>
      <button onClick={onDismiss} className="btn-quiet text-[12.5px]">
        知道了
      </button>
    </div>
  )
}

// 错误面板：显示在页面上而不是 alert，附带一键复制
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
    <div className="rounded-glass border border-danger/25 bg-danger-soft px-5 py-4 glass animate-popIn">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-danger mb-1.5">{title}</p>
          <p className="text-[12.5px] text-danger/90 leading-relaxed break-all">{message}</p>
        </div>
        <button onClick={copy} className="btn-glass shrink-0 px-3.5 py-1.5 text-[12px]">
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <p className="text-[11px] text-danger/70 mt-2.5">请截图或复制以上信息发给开发者排查</p>
    </div>
  )
}

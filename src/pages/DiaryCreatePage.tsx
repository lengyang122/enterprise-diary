import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { generateDiaryContent, regenerateSection } from '../lib/ai'
import { downloadWord, checkExportData, describeExportCheck } from '../lib/word'
import { getProfile, insertDiary, getDraft, saveDraft, clearDraft } from '../lib/storage'
import { evaluateSections, type SectionKey, type SectionQuality } from '../lib/text'
import { PlusIcon, RefreshIcon, DownloadIcon } from '../components/icons'
import QuoteCard from '../components/QuoteCard'
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

  // 草稿恢复提示 4 秒后自动收起
  useEffect(() => {
    if (!restored) return
    const timer = setTimeout(() => setRestored(false), 4000)
    return () => clearTimeout(timer)
  }, [restored])

  // 输入态用高彩度背景（动效更明显、也更贴合「随手写」的轻松感）；
  // 生成后回落成默认的柔和版，配合正式的三段式排版。
  // 标记打在 <html> 上 —— 背景由 Layout 里的 GlassBackground 渲染，不在本页的 DOM 子树里。
  useEffect(() => {
    const root = document.documentElement
    if (aiResult) root.classList.remove('bg-vivid')
    else root.classList.add('bg-vivid')
    return () => root.classList.remove('bg-vivid')
  }, [aiResult])

  function formatDate(d: Date): string {
    const month = d.getMonth() + 1
    const day = d.getDate()
    return `${month}月${day}日`
  }

  // AI 生成
  async function handleGenerate() {
    // 输入态只有一个自由文本框，正文是唯一的必填项
    if (!form.content.trim()) {
      alert('先随便写几句今天的事吧')
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
      <div className="gen-wrap animate-fadeIn">
        {/* 这里没有可选内容：禁用文本选择，光标锁成普通箭头，
            避免鼠标移上去出现 I 形文字光标或忙碌光标，看起来像页面上多了个游标 */}
        <div className="glass rounded-glass-lg px-12 py-10 text-center cursor-default select-none">
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

        {saved &&
          createPortal(
            <div className="toast-host">
              <div className="px-5 py-3 rounded-full bg-ink text-white text-[13px] shadow-glass-lift animate-popIn">
                已保存
              </div>
            </div>,
            document.body
          )}
      </div>
    )
  }

  // === 输入状态 ===
  // 用 .entry-center 在可视区里垂直居中：之前内容贴着顶部，页面显得头重脚轻，
  // 而且第一眼看不出这一页是干什么的。
  return (
    <div className="animate-riseIn entry-center">
      <div className="w-full">
        {/* 标题与说明：进页面第一眼要能看懂这里能做什么 */}
        <header className="text-center mb-5">
          <h1 className="text-[26px] font-bold text-ink tracking-tight text-static">今天</h1>
          <p className="text-[13.5px] text-ink-secondary mt-2 text-static">
            写几句今天的事，AI 帮你整理成日记
          </p>
        </header>

        {/* 随机文案（草稿恢复提示内联在这里） */}
        <QuoteCard
          notice={restored ? '已恢复上次未完成的草稿' : undefined}
          onDismissNotice={() => setRestored(false)}
        />

        {/* 唯一的输入卡 —— z-20 是必需的：
            .glass 的 backdrop-filter 会创建层叠上下文，后面若还有独立上下文且 z-index
            为 auto 的元素，会按 DOM 顺序画在它之上，把岗位下拉盖住。提级才能让弹层浮在最上面。 */}
        <div className="glass rounded-glass-lg relative z-20 px-5 py-5 md:px-7 md:py-6">
        {/* 日期与岗位放进卡片内部，省掉一条顶栏 —— 输入态要的就是「只有一个框」 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <EditableChip value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} />
          <PositionPicker
            value={form.position}
            options={POSITION_PRESETS}
            onChange={v => {
              setForm(f => ({ ...f, position: v }))
              persistPosition(v)
            }}
          />
        </div>

        <textarea
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder={'今天发生了什么？\n随便写，不用讲究分段和措辞。\n比如：上午产线巡检，贴片机抛料率偏高，跟着师傅做了 5Why 分析…'}
          rows={7}
          className="w-full bg-transparent resize-none text-[14.5px] leading-[1.95] text-ink placeholder:text-ink-tertiary ph-center"
        />
      </div>

      {genError && (
        <div className="mt-4">
          <ErrorPanel title="生成失败" message={genError} />
        </div>
      )}

      {/* 主操作：按钮做大一些，它是这一页唯一的主操作 */}
      <div className="flex justify-center pt-7">
        <button onClick={handleGenerate} className="btn-primary px-12 py-4 text-[15.5px]">
          <PlusIcon size={18} />
          整理今天
        </button>
      </div>

      {profile && (
        <p className="text-center text-[12px] text-ink-tertiary mt-6">
          {profile.name}
          {profile.company ? ` · ${profile.company}` : ''}
        </p>
      )}
      </div>
    </div>
  )
}

// ============================================================
// 局部组件
// ============================================================

// （原 PromptArea 组件已移除：改版后输入态只有一个自由文本框，不再需要三个带标题的输入区）

// 可编辑胶囊（日期等自由文本）：点击后变为输入框，回车/失焦保存
// 日期在存储与导出里一直是「9月2日」这种展示格式（Word 文件名也依赖它），
// 不能改成 ISO。所以只在这里做双向转换，让选择器用 YYYY-MM-DD，落库仍是原格式。
function labelToDateInput(label: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const m = label.match(/(\d+)月(\d+)日/)
  const month = m ? Number(m[1]) : now.getMonth() + 1
  const day = m ? Number(m[2]) : now.getDate()
  return `${now.getFullYear()}-${pad(month)}-${pad(day)}`
}

function dateInputToLabel(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  return `${Number(m[2])}月${Number(m[3])}日`
}

function EditableChip({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 进入编辑态后尝试直接弹出系统日期面板。
  // showPicker 需要用户手势，不同浏览器支持不一，失败就退回「点日历图标」。
  useEffect(() => {
    if (!editing) return
    try {
      inputRef.current?.showPicker?.()
    } catch {
      /* 忽略：面板没自动弹就手动点一下 */
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="date"
        value={labelToDateInput(value)}
        onChange={e => {
          const v = dateInputToLabel(e.target.value)
          if (v) onChange(v)
          setEditing(false)
        }}
        onBlur={() => setEditing(false)}
        onKeyDown={e => {
          if (e.key === 'Escape') setEditing(false)
        }}
        className="px-3 py-1.5 text-[13px] text-ink bg-white/85 border border-accent rounded-full shadow-glass-sm outline-none"
      />
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="chip chip-glass chip-tap" title="点击选择日期">
      {value}
    </button>
  )
}

// 岗位选择器：自绘玻璃下拉。
// 不用原生 <datalist> —— 它的弹出层是浏览器默认样式，既无法定制，
// 又会以系统样式浮在玻璃界面之上，位置也不受控。
function PositionPicker({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const boxRef = useRef<HTMLDivElement>(null)

  // 打开时输入框留空 —— 这样能直接看到全部预设；输入才做筛选
  function openPicker() {
    setDraft('')
    setOpen(true)
  }

  function commit(next?: string) {
    const v = (next ?? draft).trim()
    if (v) onChange(v)
    setOpen(false)
  }

  // 点击外部或按 Esc 关闭
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const keyword = draft.trim().toLowerCase()
  const filtered = keyword ? options.filter(o => o.toLowerCase().includes(keyword)) : options

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={openPicker} className="chip chip-glass chip-tap" title="点击选择岗位">
        {value}
      </button>

      {open && (
        // 弹出层比普通玻璃更实：它悬在正文之上，太透会让底下的文字透上来，列表读不清
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[232px] rounded-glass bg-white/90 border border-white/90 p-2 shadow-glass-lift animate-popIn backdrop-blur-2xl backdrop-saturate-150">
          <input
            autoFocus
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
            }}
            placeholder="输入或选择岗位"
            className="w-full px-3 py-2 mb-1.5 rounded-[10px] bg-white/80 border border-white text-[13px] text-ink placeholder:text-ink-tertiary"
          />

          <div className="max-h-[216px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-[12px] text-ink-tertiary leading-relaxed">
                没有匹配的预设，回车可直接使用「{draft.trim()}」
              </p>
            ) : (
              filtered.map(o => (
                <button
                  key={o}
                  onClick={() => commit(o)}
                  className={`w-full text-left px-3 py-2 rounded-[10px] text-[13px] transition-colors duration-200 ${
                    o === value
                      ? 'bg-accent-soft text-accent font-semibold'
                      : 'text-ink-secondary hover:bg-white hover:text-ink'
                  }`}
                >
                  {o}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
      {/* 标题居中；字数与「重新生成」在窄屏另起一行居中，
          宽屏绝对定位到右侧 —— 否则会与居中标题重叠 */}
      <div className="relative mb-3">
        <h3 className="text-center text-[14px] font-semibold text-ink tracking-tight text-static">
          {title}
        </h3>
        <div className="mt-2 flex items-center justify-center gap-2 sm:mt-0 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 sm:justify-end">
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

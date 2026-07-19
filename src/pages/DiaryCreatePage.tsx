import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateDiaryContent } from '../lib/ai'
import { downloadWord } from '../lib/word'
import type { Profile, DiaryFormInput, AIGeneratedResult } from '../types'

const PROFILE_ID_KEY = 'enterprise-diary-profile-id'

export default function DiaryCreatePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiResult, setAiResult] = useState<AIGeneratedResult | null>(null)
  const [form, setForm] = useState<DiaryFormInput>({
    date: formatDate(new Date()),
    position: 'PQE',
    today_work: '',
    learn_content: '',
    problems: '',
    thinking: '',
  })

  // 加载个人信息
  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const storedId = localStorage.getItem(PROFILE_ID_KEY)
    if (storedId) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedId)
        .single()
      if (data) setProfile(data)
    }
  }

  function formatDate(d: Date): string {
    return `${d.getMonth() + 1}.${d.getDate()}`
  }

  // AI 生成
  async function handleGenerate() {
    if (!form.today_work && !form.learn_content && !form.problems) {
      alert('请至少填写今日工作、学习内容或发现问题中的一项')
      return
    }

    setGenerating(true)
    try {
      const result = await generateDiaryContent(form)
      setAiResult(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '生成失败'
      alert(message)
    } finally {
      setGenerating(false)
    }
  }

  // 保存到数据库
  async function handleSave() {
    if (!profile) {
      alert('请先在设置页面填写个人信息')
      return
    }
    if (!aiResult) {
      alert('请先让 AI 生成内容')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('diaries')
        .insert({
          profile_id: profile.id,
          date: form.date,
          position: form.position,
          today_work: form.today_work,
          learn_content: form.learn_content,
          problems: form.problems,
          thinking: form.thinking,
          generated_content: aiResult.content,
          generated_feelings: aiResult.feelings,
          generated_other: aiResult.other,
        })

      if (error) throw error
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

    await downloadWord({
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
    })
  }

  // 重置表单
  function handleReset() {
    setForm({
      date: formatDate(new Date()),
      position: 'PQE',
      today_work: '',
      learn_content: '',
      problems: '',
      thinking: '',
    })
    setAiResult(null)
    setSaved(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">📝 新建日记</h2>
          <p className="text-sm text-notion-text-secondary mt-1">
            {profile ? `${profile.name} · ${profile.company}` : '请先到设置页面填写个人信息'}
          </p>
        </div>
        {aiResult && (
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm border border-notion-border rounded-md hover:bg-notion-hover transition-colors"
            >
              新建
            </button>
          </div>
        )}
      </div>

      {/* 用户输入区 */}
      <section className="bg-notion-card rounded-lg border border-notion-border p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <div>
            <label className="block text-xs text-notion-text-secondary mb-1">日期</label>
            <input
              type="text"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              placeholder="7.17"
              className="w-28 px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-notion-text-secondary mb-1">实习岗位</label>
            <input
              type="text"
              value={form.position}
              onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              className="w-28 px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 bg-white"
            />
          </div>
        </div>

        <TextArea
          label="今日工作"
          value={form.today_work}
          onChange={v => setForm(f => ({ ...f, today_work: v }))}
          placeholder="今天在SMT车间做了什么？参与了哪些工序？跟进了什么质量问题？"
        />
        <TextArea
          label="学习内容"
          value={form.learn_content}
          onChange={v => setForm(f => ({ ...f, learn_content: v }))}
          placeholder="学到了什么新知识？QCP、SPC、AOI检测？"
        />
        <TextArea
          label="发现问题"
          value={form.problems}
          onChange={v => setForm(f => ({ ...f, problems: v }))}
          placeholder="发现了什么生产或质量问题？"
        />
        <TextArea
          label="思考"
          value={form.thinking}
          onChange={v => setForm(f => ({ ...f, thinking: v }))}
          placeholder="你的思考和感悟"
        />

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-notion-accent text-white rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⟳</span>
                AI 生成中...
              </>
            ) : (
              '🤖 AI 生成日记'
            )}
          </button>
        </div>
      </section>

      {/* AI 生成结果预览区 */}
      {aiResult && (
        <section className="bg-notion-card rounded-lg border border-notion-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">✨ 生成结果</h3>
            <span className="text-xs text-notion-text-secondary">
              {form.date} · {form.position}
            </span>
          </div>

          <PreviewBlock
            label="实习内容"
            value={aiResult.content}
          />
          <PreviewBlock
            label="实习体会和感受"
            value={aiResult.feelings}
          />
          <PreviewBlock
            label="其他"
            value={aiResult.other}
          />

          <div className="flex gap-3 pt-4 border-t border-notion-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '保存中...' : '💾 保存到数据库'}
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 border border-notion-border rounded-md text-sm hover:bg-notion-hover transition-colors"
            >
              📄 下载 Word 文档
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-notion-border rounded-md text-sm hover:bg-notion-hover transition-colors"
            >
              ✏️ 重新生成
            </button>
          </div>
        </section>
      )}

      {/* 保存成功提示 */}
      {saved && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg text-sm">
          ✅ 日记已保存
        </div>
      )}
    </div>
  )
}

// 文本输入框
function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-notion-text-secondary mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 focus:border-notion-accent bg-white resize-vertical"
      />
    </div>
  )
}

// 预览块
function PreviewBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-notion-bg rounded-md p-4">
      <h4 className="text-sm font-medium text-notion-accent mb-2">{label}</h4>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

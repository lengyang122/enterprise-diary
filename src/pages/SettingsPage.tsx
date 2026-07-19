import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { getAIConfig, saveAIConfig, type AIConfig } from '../lib/ai'
import type { Profile } from '../types'

// 本地存储的 profile_id key
const PROFILE_ID_KEY = 'enterprise-diary-profile-id'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

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

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)

    const id = profile.id || crypto.randomUUID()
    localStorage.setItem(PROFILE_ID_KEY, id)

    const { error } = await supabase
      .from('profiles')
      .upsert({ ...profile, id })
    
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  function handleAiConfigSave() {
    saveAIConfig(aiConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">⚙️ 设置</h2>
        <p className="text-sm text-notion-text-secondary mt-1">配置个人信息和 AI 接口</p>
      </div>

      {/* 个人信息 */}
      <section className="bg-notion-card rounded-lg border border-notion-border p-6">
        <h3 className="text-lg font-medium mb-4">📋 个人信息</h3>
        <p className="text-xs text-notion-text-secondary mb-4">
          首次填写后自动保存，后续新建日记时自动填充
        </p>
        
        <form onSubmit={handleProfileSave} className="grid grid-cols-2 gap-4">
          <InputField label="姓名" value={profile?.name || ''} onChange={v => setProfile(p => p ? { ...p, name: v } : null)} />
          <InputField label="学号" value={profile?.student_id || ''} onChange={v => setProfile(p => p ? { ...p, student_id: v } : null)} />
          <InputField label="班级" value={profile?.class_name || ''} onChange={v => setProfile(p => p ? { ...p, class_name: v } : null)} />
          <InputField label="学院名称" value={profile?.college || '管理工程与科学'} onChange={v => setProfile(p => p ? { ...p, college: v } : null)} />
          <InputField label="专业" value={profile?.major || '质量管理工程'} onChange={v => setProfile(p => p ? { ...p, major: v } : null)} />
          <InputField label="专业指导教师" value={profile?.teacher || ''} onChange={v => setProfile(p => p ? { ...p, teacher: v } : null)} />
          <InputField label="实习单位" value={profile?.company || '余姚舜宇智能光学技术有限公司'} onChange={v => setProfile(p => p ? { ...p, company: v } : null)} />
          <InputField label="企业指导教师" value={profile?.company_teacher || ''} onChange={v => setProfile(p => p ? { ...p, company_teacher: v } : null)} />
          <InputField label="实习开始日期" type="text" value={profile?.start_date || ''} onChange={v => setProfile(p => p ? { ...p, start_date: v } : null)} placeholder="2026年 7 月 7 日" />
          <InputField label="实习结束日期" type="text" value={profile?.end_date || ''} onChange={v => setProfile(p => p ? { ...p, end_date: v } : null)} placeholder="2027 年 5 月 7日" />

          <div className="col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-notion-accent text-white rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存个人信息'}
            </button>
          </div>
        </form>
      </section>

      {/* AI 配置 */}
      <section className="bg-notion-card rounded-lg border border-notion-border p-6">
        <h3 className="text-lg font-medium mb-4">🤖 AI 接口配置</h3>
        <p className="text-xs text-notion-text-secondary mb-4">
          配置 AI API 用于自动生成日记内容。支持 OpenAI 兼容接口（如 DeepSeek、GPT 等）
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">API Key</label>
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 focus:border-notion-accent bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">API 地址</label>
            <input
              type="url"
              value={aiConfig.apiUrl}
              onChange={e => setAiConfig(c => ({ ...c, apiUrl: e.target.value }))}
              placeholder="https://api.deepseek.com/v1/chat/completions"
              className="w-full px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 focus:border-notion-accent bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">模型名称</label>
            <input
              type="text"
              value={aiConfig.model}
              onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
              placeholder="deepseek-chat / gpt-4o-mini"
              className="w-full px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 focus:border-notion-accent bg-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAiConfigSave}
              className="px-4 py-2 bg-notion-accent text-white rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              保存 AI 配置
            </button>
          </div>
        </div>
      </section>

      {/* 保存成功提示 */}
      {saved && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg text-sm">
          ✅ 保存成功
        </div>
      )}
    </div>
  )
}

// 输入字段组件
function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-notion-text-secondary mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-notion-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-notion-accent/30 focus:border-notion-accent bg-white"
      />
    </div>
  )
}

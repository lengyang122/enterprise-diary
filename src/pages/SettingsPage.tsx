import { useState, useEffect, type FormEvent } from 'react'
import { getAIConfig, saveAIConfig, type AIConfig } from '../lib/ai'
import { saveProfile, getProfile } from '../lib/storage'
import type { Profile } from '../types'

// 创建默认 profile 对象
function createEmptyProfile(): Profile {
  return {
    name: '',
    student_id: '',
    class_name: '',
    college: '管理工程与科学',
    major: '质量管理工程',
    teacher: '陈家焱',
    company: '余姚舜宇智能光学技术有限公司',
    company_teacher: '陶凯',
    start_date: '',
    end_date: '',
  }
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)

  // 加载个人信息
  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    setLoading(true)
    try {
      const data = await getProfile()
      setProfile(data ?? createEmptyProfile())
    } catch {
      setProfile(createEmptyProfile())
    }
    setLoading(false)
  }

  // 更新 profile 字段（自动处理 null 情况）
  function updateField<K extends keyof Profile>(field: K, value: Profile[K]) {
    setProfile(p => p ? { ...p, [field]: value } : { ...createEmptyProfile(), [field]: value })
  }

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setErrorMsg('')

    try {
      const cleanData = {
        name: profile.name || '',
        student_id: profile.student_id || '',
        class_name: profile.class_name || '',
        college: profile.college || '',
        major: profile.major || '',
        teacher: profile.teacher || '',
        company: profile.company || '',
        company_teacher: profile.company_teacher || '',
        start_date: profile.start_date || '',
        end_date: profile.end_date || '',
      }

      console.log('[Settings] Saving profile')
      const persisted = await saveProfile(cleanData)

      console.log('[Settings] Save success')
      setProfile(persisted)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[Settings] Save error:', e)
      setErrorMsg(msg)
    }
    setSaving(false)
  }

  function handleAiConfigSave() {
    saveAIConfig(aiConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return <div className="text-center py-16 text-base-muted text-sm">加载中…</div>
  }

  return (
    <div className="max-w-[560px] mx-auto animate-fadeIn">
      {/* 标题 */}
      <div className="mb-10">
        <h2 className="text-[22px] font-medium tracking-tight text-base-text">设置</h2>
      </div>

      {/* 基础设置 */}
      <section className="mb-10">
        <h3 className="text-[12px] font-medium text-base-muted tracking-wider uppercase mb-1.5 px-1">基础信息</h3>
        <p className="text-[11px] text-base-muted px-1 mb-3">点击右侧内容即可修改，改完请点「保存」（帮同学写日记时，改成同学的信息即可）</p>
        <form onSubmit={handleProfileSave} className="bg-base-surface rounded-[14px] px-6 py-2 divide-y divide-base-line/60">
          <SettingRow label="姓名">
            <input
              type="text"
              value={profile?.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="你的名字"
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="学号">
            <input
              type="text"
              value={profile?.student_id || ''}
              onChange={e => updateField('student_id', e.target.value)}
              placeholder="学号"
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="班级">
            <input
              type="text"
              value={profile?.class_name || ''}
              onChange={e => updateField('class_name', e.target.value)}
              placeholder="班级"
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="学院">
            <input
              type="text"
              value={profile?.college || ''}
              onChange={e => updateField('college', e.target.value)}
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="专业">
            <input
              type="text"
              value={profile?.major || ''}
              onChange={e => updateField('major', e.target.value)}
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="专业指导教师">
            <input
              type="text"
              value={profile?.teacher || ''}
              onChange={e => updateField('teacher', e.target.value)}
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="实习单位">
            <input
              type="text"
              value={profile?.company || ''}
              onChange={e => updateField('company', e.target.value)}
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="企业指导教师">
            <input
              type="text"
              value={profile?.company_teacher || ''}
              onChange={e => updateField('company_teacher', e.target.value)}
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="实习起止">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={profile?.start_date || ''}
                onChange={e => updateField('start_date', e.target.value)}
                placeholder="开始"
                className="w-24 text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
              />
              <span className="text-base-muted">—</span>
              <input
                type="text"
                value={profile?.end_date || ''}
                onChange={e => updateField('end_date', e.target.value)}
                placeholder="结束"
                className="w-24 text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
              />
            </div>
          </SettingRow>

          {errorMsg && (
            <div className="py-3 text-[13px] text-red-500">{errorMsg}</div>
          )}

          <div className="py-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-[10px] bg-base-accent text-white text-[13px] hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </section>

      {/* AI 设置 */}
      <section className="mb-10">
        <h3 className="text-[12px] font-medium text-base-muted tracking-wider uppercase mb-4 px-1">AI 设置</h3>
        <div className="bg-base-surface rounded-[14px] px-6 py-2 divide-y divide-base-line/60">
          <SettingRow label="API Key">
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="API 地址">
            <input
              type="url"
              value={aiConfig.apiUrl}
              onChange={e => setAiConfig(c => ({ ...c, apiUrl: e.target.value }))}
              placeholder="https://api.deepseek.com/v1/chat/completions"
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <SettingRow label="模型">
            <input
              type="text"
              value={aiConfig.model}
              onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
              placeholder="deepseek-v4-flash"
              className="w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-2 py-1 -mx-2 rounded-lg transition-colors duration-150 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30 cursor-text"
            />
          </SettingRow>
          <div className="py-4 flex justify-end">
            <button
              type="button"
              onClick={handleAiConfigSave}
              className="px-4 py-1.5 rounded-[10px] bg-base-accent text-white text-[13px] hover:opacity-90 active:scale-[0.98] transition-all duration-150"
            >
              保存 AI 配置
            </button>
          </div>
        </div>
      </section>

      {/* 保存成功提示 */}
      {saved && (
        <div className="fixed bottom-8 right-8 px-4 py-2 rounded-[11px] bg-base-text text-base-surface text-[13px] shadow-soft animate-fadeIn z-50">
          已保存
        </div>
      )}
    </div>
  )
}

// 设置行组件
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <label className="text-[13px] text-base-secondary shrink-0">{label}</label>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

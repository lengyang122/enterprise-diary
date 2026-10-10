import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react'
import { getAIConfig, saveAIConfig, type AIConfig } from '../lib/aiConfig'
import { saveProfile, getProfile, getDiaries } from '../lib/storage'
import {
  downloadBackup,
  parseBackupFile,
  applyBackup,
  type BackupPayload,
  type ImportMode,
} from '../lib/backup'
import { DownloadIcon, UploadIcon, CloseIcon } from '../components/icons'
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

// 右对齐的隐式输入框：静止时无边界，悬停/聚焦时浮出底色
const inputCls =
  'w-full text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted ' +
  'px-3 py-2 -mx-3 rounded-[10px] transition-colors duration-200 ' +
  'hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)

  // 数据备份
  const [diaryCount, setDiaryCount] = useState(0)
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupErr, setBackupErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载个人信息与日记数量
  useEffect(() => {
    loadProfile()
    refreshDiaryCount()
  }, [])

  async function refreshDiaryCount() {
    try {
      setDiaryCount((await getDiaries()).length)
    } catch {
      setDiaryCount(0)
    }
  }

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
    setProfile(p => (p ? { ...p, [field]: value } : { ...createEmptyProfile(), [field]: value }))
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

      const persisted = await saveProfile(cleanData)
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

  // === 数据备份 ===

  async function handleExportBackup() {
    setBackupErr('')
    setBackupMsg('')
    try {
      const name = await downloadBackup()
      setBackupMsg(`已导出：${name}`)
    } catch (e: unknown) {
      setBackupErr(e instanceof Error ? e.message : String(e))
    }
  }

  async function handlePickBackupFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许连续选择同一个文件
    if (!file) return

    setBackupErr('')
    setBackupMsg('')
    setPendingBackup(null)
    try {
      const result = parseBackupFile(await file.text())
      if (!result.ok) {
        setBackupErr(result.error)
        return
      }
      setPendingBackup(result.payload)
    } catch (err: unknown) {
      setBackupErr(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleImportBackup(mode: ImportMode) {
    if (!pendingBackup) return
    setBackupErr('')
    try {
      const s = await applyBackup(pendingBackup, mode)
      setPendingBackup(null)
      setBackupMsg(`导入完成：新增 ${s.added} 篇` + (s.skipped ? `，跳过重复 ${s.skipped} 篇` : ''))
      await refreshDiaryCount()
    } catch (e: unknown) {
      setBackupErr(e instanceof Error ? e.message : String(e))
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-base-muted text-[13px]">加载中…</div>
  }

  return (
    <div className="max-w-[720px] mx-auto animate-riseIn">
      {/* 标题 */}
      <div className="mb-8">
        <h2 className="text-[24px] font-semibold tracking-tight text-base-text">设置</h2>
        <p className="text-[13px] text-base-muted mt-1.5">这些信息会填进导出的 Word 文档</p>
      </div>

      {/* 基础信息 */}
      <section className="mb-6">
        <SectionHeader
          title="基础信息"
          desc="点击右侧内容即可修改，改完请点「保存」（帮同学写日记时，改成同学的信息即可）"
        />
        <form onSubmit={handleProfileSave} className="card px-5 md:px-6 py-1.5">
          <SettingRow label="姓名">
            <input
              type="text"
              value={profile?.name || ''}
              onChange={e => updateField('name', e.target.value)}
              placeholder="你的名字"
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="学号">
            <input
              type="text"
              value={profile?.student_id || ''}
              onChange={e => updateField('student_id', e.target.value)}
              placeholder="学号"
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="班级">
            <input
              type="text"
              value={profile?.class_name || ''}
              onChange={e => updateField('class_name', e.target.value)}
              placeholder="班级"
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="学院">
            <input
              type="text"
              value={profile?.college || ''}
              onChange={e => updateField('college', e.target.value)}
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="专业">
            <input
              type="text"
              value={profile?.major || ''}
              onChange={e => updateField('major', e.target.value)}
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="专业指导教师">
            <input
              type="text"
              value={profile?.teacher || ''}
              onChange={e => updateField('teacher', e.target.value)}
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="实习单位">
            <input
              type="text"
              value={profile?.company || ''}
              onChange={e => updateField('company', e.target.value)}
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="企业指导教师">
            <input
              type="text"
              value={profile?.company_teacher || ''}
              onChange={e => updateField('company_teacher', e.target.value)}
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="实习起止">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={profile?.start_date || ''}
                onChange={e => updateField('start_date', e.target.value)}
                placeholder="开始"
                className="w-28 text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-3 py-2 rounded-[10px] transition-colors duration-200 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30"
              />
              <span className="text-base-muted">—</span>
              <input
                type="text"
                value={profile?.end_date || ''}
                onChange={e => updateField('end_date', e.target.value)}
                placeholder="结束"
                className="w-28 text-right bg-transparent text-[14px] text-base-text placeholder:text-base-muted px-3 py-2 rounded-[10px] transition-colors duration-200 hover:bg-base-bg focus:bg-base-bg focus:ring-1 focus:ring-base-accent/30"
              />
            </div>
          </SettingRow>

          {errorMsg && <div className="py-3 text-[13px] text-red-500">{errorMsg}</div>}

          <div className="py-4 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-[13px]">
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </section>

      {/* AI 设置 */}
      <section className="mb-6">
        <SectionHeader title="AI 设置" desc="接口由你自己提供，Key 只保存在本机浏览器" />
        <div className="card px-5 md:px-6 py-1.5">
          <SettingRow label="API Key">
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
              placeholder="sk-..."
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="API 地址">
            <input
              type="url"
              value={aiConfig.apiUrl}
              onChange={e => setAiConfig(c => ({ ...c, apiUrl: e.target.value }))}
              placeholder="https://api.deepseek.com/v1/chat/completions"
              className={inputCls}
            />
          </SettingRow>
          <SettingRow label="模型">
            <input
              type="text"
              value={aiConfig.model}
              onChange={e => setAiConfig(c => ({ ...c, model: e.target.value }))}
              placeholder="deepseek-v4-flash"
              className={inputCls}
            />
          </SettingRow>
          <div className="py-4 flex justify-end">
            <button
              type="button"
              onClick={handleAiConfigSave}
              className="btn-primary px-5 py-2 text-[13px]"
            >
              保存 AI 配置
            </button>
          </div>
        </div>
      </section>

      {/* 数据备份 */}
      <section className="mb-6">
        <SectionHeader title="数据备份" desc="建议定期导出，避免清理浏览器数据时丢失" />
        <div className="card px-5 md:px-6 py-5">
          <p className="text-[12.5px] text-base-secondary leading-relaxed">
            日记与个人信息只保存在这台设备的浏览器里。
            <span className="text-base-text font-medium">清除浏览器数据会导致全部日记丢失</span>
            。
          </p>
          <p className="text-[11.5px] text-base-muted mt-2">当前共 {diaryCount} 篇日记</p>

          <div className="flex flex-wrap gap-2.5 mt-4">
            <button onClick={handleExportBackup} className="btn-primary px-4 py-2 text-[13px]">
              <DownloadIcon size={15} />
              导出备份
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-ghost px-4 py-2 text-[13px]"
            >
              <UploadIcon size={15} />
              导入备份
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handlePickBackupFile}
          />

          {pendingBackup && (
            <div className="mt-4 rounded-[12px] border border-base-line bg-base-bg/60 px-4 py-3.5 animate-fadeIn">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-base-text">备份文件已读取</p>
                  <p className="text-[11.5px] text-base-muted mt-1.5 leading-relaxed">
                    {pendingBackup.exportedAt
                      ? `导出时间 ${new Date(pendingBackup.exportedAt).toLocaleString('zh-CN')} · `
                      : ''}
                    含 {pendingBackup.diaries.length} 篇日记
                    {pendingBackup.profile ? ' · 含个人信息' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setPendingBackup(null)}
                  className="shrink-0 p-1.5 rounded-[9px] text-base-muted hover:text-base-text hover:bg-base-surface transition-colors duration-200"
                  title="取消"
                >
                  <CloseIcon size={14} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3.5">
                <button
                  onClick={() => handleImportBackup('merge')}
                  className="btn-primary px-3.5 py-1.5 text-[12px]"
                >
                  合并导入
                </button>
                <button
                  onClick={() => handleImportBackup('replace')}
                  className="btn-ghost px-3.5 py-1.5 text-[12px]"
                >
                  覆盖导入
                </button>
              </div>
              <p className="text-[11px] text-base-muted mt-2.5 leading-relaxed">
                合并：保留现有日记，只追加不重复的部分。覆盖：清空现有日记后写入备份内容。
              </p>
            </div>
          )}

          {backupErr && (
            <p className="text-[12px] text-red-500 mt-3 leading-relaxed">{backupErr}</p>
          )}
          {backupMsg && (
            <p className="text-[12px] text-base-secondary mt-3 break-all">{backupMsg}</p>
          )}
        </div>
      </section>

      {/* 保存成功提示 */}
      {saved && (
        <div className="fixed bottom-8 right-8 px-4 py-2.5 rounded-button bg-base-text text-base-surface text-[13px] shadow-lift animate-fadeIn z-50">
          已保存
        </div>
      )}
    </div>
  )
}

// 区块标题
function SectionHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="px-1 mb-3">
      <h3 className="text-[12px] font-semibold text-base-secondary tracking-wider uppercase">
        {title}
      </h3>
      {desc && <p className="text-[11.5px] text-base-muted mt-1.5">{desc}</p>}
    </div>
  )
}

// 设置行组件
function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-base-line last:border-b-0">
      <label className="text-[13px] text-base-secondary shrink-0">{label}</label>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createBackup,
  validateBackup,
  parseBackupFile,
  applyBackup,
  downloadBackup,
  BACKUP_VERSION,
  type BackupPayload,
} from './backup'
import { getDiaries, getProfile, saveProfile, EMPTY_PROFILE } from './storage'
import { saveAIConfig, DEFAULT_AI_CONFIG } from './aiConfig'
import type { DiaryEntry } from '../types'

const { saveAsMock } = vi.hoisted(() => ({ saveAsMock: vi.fn() }))
vi.mock('file-saver', () => ({ saveAs: saveAsMock }))

const entry = (id: string, content: string): DiaryEntry => ({
  id,
  date: '8月1日',
  position: 'PQE',
  content,
  feelings: '',
  other: '',
  created_at: '2026-01-01T00:00:00.000Z',
})

const payload = (over: Partial<BackupPayload> = {}): BackupPayload => ({
  app: 'enterprise-diary',
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  profile: null,
  diaries: [],
  aiConfig: null,
  ...over,
})

describe('createBackup', () => {
  beforeEach(() => localStorage.clear())

  it('包含应用标识、版本号与导出时间', async () => {
    const b = await createBackup()
    expect(b.app).toBe('enterprise-diary')
    expect(b.version).toBe(BACKUP_VERSION)
    expect(b.exportedAt).toBeTruthy()
    expect(b.diaries).toEqual([])
  })

  it('汇总个人信息、日记与 AI 配置', async () => {
    await saveProfile({ ...EMPTY_PROFILE, name: '张三' })
    saveAIConfig({ ...DEFAULT_AI_CONFIG, apiKey: 'sk-test' })
    const b = await createBackup()
    expect(b.profile?.name).toBe('张三')
    expect(b.aiConfig?.apiKey).toBe('sk-test')
  })
})

describe('validateBackup', () => {
  it('拒绝非对象内容', () => {
    expect(validateBackup(null).ok).toBe(false)
    expect(validateBackup('x').ok).toBe(false)
    expect(validateBackup([]).ok).toBe(false)
    expect(validateBackup(42).ok).toBe(false)
  })

  it('拒绝其他应用的备份', () => {
    const r = validateBackup({ version: 1, diaries: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('企业实践日记')
  })

  it('拒绝高于当前版本的备份', () => {
    const r = validateBackup({ app: 'enterprise-diary', version: 99, diaries: [] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain('99')
  })

  it('拒绝缺少日记列表的备份', () => {
    expect(validateBackup({ app: 'enterprise-diary', version: 1 }).ok).toBe(false)
  })

  it('规范化缺失字段并补齐 id / created_at', () => {
    const r = validateBackup({
      app: 'enterprise-diary',
      version: 1,
      diaries: [{ content: '只有内容' }],
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      const d = r.payload.diaries[0]
      expect(r.payload.diaries).toHaveLength(1)
      expect(d.content).toBe('只有内容')
      expect(d.id).toBeTruthy()
      expect(d.created_at).toBeTruthy()
      expect(d.feelings).toBe('')
    }
  })

  it('丢弃日记列表中的非对象项', () => {
    const r = validateBackup({
      app: 'enterprise-diary',
      version: 1,
      diaries: [1, 'x', null, { content: 'A' }],
    })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.payload.diaries).toHaveLength(1)
  })
})

describe('parseBackupFile', () => {
  it('非法 JSON 返回错误而不是抛错', () => {
    expect(parseBackupFile('{ 坏掉的').ok).toBe(false)
  })

  it('合法 JSON 走同一套校验', () => {
    const r = parseBackupFile(JSON.stringify({ app: 'enterprise-diary', version: 1, diaries: [] }))
    expect(r.ok).toBe(true)
  })
})

describe('applyBackup', () => {
  beforeEach(() => localStorage.clear())

  it('合并模式按 id 去重', async () => {
    localStorage.setItem('enterprise-diary-entries', JSON.stringify([entry('a', '已有')]))
    const s = await applyBackup(
      payload({ diaries: [entry('a', '重复'), entry('b', '新增')] }),
      'merge'
    )
    expect(s.added).toBe(1)
    expect(s.skipped).toBe(1)
    expect(await getDiaries()).toHaveLength(2)
  })

  it('覆盖模式先清空再写入', async () => {
    localStorage.setItem('enterprise-diary-entries', JSON.stringify([entry('a', '旧')]))
    const s = await applyBackup(payload({ diaries: [entry('b', '新')] }), 'replace')
    expect(s.added).toBe(1)
    const list = await getDiaries()
    expect(list).toHaveLength(1)
    expect(list[0].content).toBe('新')
  })

  it('恢复个人信息与 AI 配置', async () => {
    const s = await applyBackup(
      payload({
        profile: { ...EMPTY_PROFILE, name: '李四' },
        aiConfig: { ...DEFAULT_AI_CONFIG, apiKey: 'sk-x' },
      }),
      'merge'
    )
    expect(s.profileRestored).toBe(true)
    expect(s.aiConfigRestored).toBe(true)
    expect((await getProfile())?.name).toBe('李四')
  })

  it('个人信息全空时不覆盖现有信息', async () => {
    await saveProfile({ ...EMPTY_PROFILE, name: '原有' })
    const s = await applyBackup(payload({ profile: { ...EMPTY_PROFILE } }), 'merge')
    expect(s.profileRestored).toBe(false)
    expect((await getProfile())?.name).toBe('原有')
  })
})

describe('downloadBackup', () => {
  beforeEach(() => {
    localStorage.clear()
    saveAsMock.mockClear()
  })

  it('生成 json 备份并触发下载', async () => {
    await saveProfile({ ...EMPTY_PROFILE, name: '张三' })
    const name = await downloadBackup()
    expect(name).toMatch(/^企业实践日记_备份_.*\.json$/)
    expect(saveAsMock).toHaveBeenCalledTimes(1)

    const blob = saveAsMock.mock.calls[0][0] as Blob
    expect(JSON.parse(await blob.text()).profile.name).toBe('张三')
  })
})
